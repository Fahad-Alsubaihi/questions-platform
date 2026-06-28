import { generateObject, generateText, jsonSchema } from "ai";
import { z } from "zod";
import { db, agentConfigs, questions, apiKeys } from "@/lib/db";
import { eq } from "drizzle-orm";
import { sanitizeText } from "@/lib/ai/sanitize";
import { decrypt } from "@/lib/crypto";
import { hashQuestion } from "@/lib/utils";
import {
  buildOutputSchema,
  formatFewShotExamples,
  type FewShotExample,
} from "@/lib/ai/schema-builder";

// Runtime Zod validator — built from domains at call time for type-safety
function buildZodValidator(domains: string[]) {
  const domainEnum =
    domains.length > 0
      ? (domains as [string, ...string[]])
      : (["عام"] as [string, ...string[]]);

  return z.object({
    questions: z.array(
      z.object({
        question: z.string(),
        type: z.enum(["MCQ", "True-False", "Short Answer"]),
        options: z.array(z.string()),
        correctAnswer: z.string(),
        hint: z.string(),
        explanation: z.string(),
        sourceUrl: z.string(),
        domain: z.enum(domainEnum),
        subdomain: z.string(),
        difficulty: z.enum(["Easy", "Medium", "Hard"]),
      })
    ),
  });
}

async function getActiveProvider() {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.isActive, true))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(
      "لا يوجد مزود ذكاء اصطناعي نشط. اذهب إلى الإعدادات → مزودو الذكاء الاصطناعي."
    );
  }

  const row = rows[0];
  const key = decrypt(row.encryptedKey);

  if (row.provider === "gemini") {
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    const google = createGoogleGenerativeAI({ apiKey: key });
    const modelId = row.model || "gemini-2.0-flash";
    return { model: google(modelId), provider: "gemini" as const };
  }

  if (row.provider === "groq") {
    const { createGroq } = await import("@ai-sdk/groq");
    const groq = createGroq({ apiKey: key });
    const modelId = row.model || "meta-llama/llama-4-scout-17b-16e-instruct";
    return { model: groq(modelId), provider: "groq" as const };
  }

  throw new Error(`Unknown provider: ${row.provider}`);
}

async function getActiveConfig() {
  const configs = await db
    .select()
    .from(agentConfigs)
    .where(eq(agentConfigs.isActive, true))
    .limit(1);
  return configs[0] ?? null;
}

async function getTavilyKey(): Promise<string> {
  try {
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.provider, "tavily" as "gemini")).limit(1);
    if (rows.length > 0) return decrypt(rows[0].encryptedKey);
  } catch {}
  return process.env.TAVILY_API_KEY ?? "";
}

async function searchWeb(query: string): Promise<string> {
  const tavilyKey = await getTavilyKey();
  if (!tavilyKey) return "";
  try {
    const { tavily } = await import("@tavily/core");
    const client = tavily({ apiKey: tavilyKey });
    const result = await client.search(sanitizeText(query), {
      maxResults: 5,
      searchDepth: "advanced",
    });
    return result.results
      .map((r) => `العنوان: ${r.title}\nالمحتوى: ${r.content}\nالمصدر: ${r.url}`)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

async function extractFromUrls(urls: string[]): Promise<string> {
  const tavilyKey = await getTavilyKey();
  if (!tavilyKey || urls.length === 0) return "";
  try {
    const { tavily } = await import("@tavily/core");
    const client = tavily({ apiKey: tavilyKey });
    const result = await client.extract(urls);
    return result.results
      .map((r) => `المصدر: ${r.url}\nالمحتوى: ${r.rawContent}`)
      .join("\n\n---\n\n");
  } catch {
    return "";
  }
}

// Gemini: uses generateObject with jsonSchema() from DB — domain enum is enforced by API
async function generateWithGemini(
  model: Parameters<typeof generateObject>[0]["model"],
  outputSchemaJson: Record<string, unknown>,
  systemContent: string,
  userContent: string,
  temperature: number
) {
  const result = await generateObject({
    model,
    schema: jsonSchema(outputSchemaJson),
    system: systemContent,
    prompt: userContent,
    temperature,
  });
  return result.object as { questions: Record<string, unknown>[] };
}

// Groq: generateText with explicit topic-first prompt, parse manually
async function generateWithGroq(
  model: Parameters<typeof generateText>[0]["model"],
  outputSchemaJson: Record<string, unknown>,
  examples: FewShotExample[],
  topic: string,
  userContent: string,
  temperature: number,
  systemContent: string
) {
  const schemaStr = JSON.stringify(outputSchemaJson, null, 2);
  const examplesStr = formatFewShotExamples(examples);

  // Topic goes FIRST — before schema and examples — to avoid model drift
  const fullSystem = `المهمة: أنت مولد أسئلة تريفيا بالعربية عن "${topic}" فقط. لا تولّد أسئلة عن أي موضوع آخر.

${systemContent}

أجب بـ JSON فقط يطابق هذا الـ schema:
${schemaStr}

(الأمثلة التالية لتوضيح التنسيق المطلوب فقط — ليست الموضوع المطلوب):
${examplesStr}`;

  const result = await generateText({
    model,
    system: fullSystem,
    prompt: userContent,
    temperature,
    providerOptions: { groq: { structuredOutputs: false } },
  });

  let raw = result.text;
  raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");
  raw = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("لم يتم إنشاء JSON صحيح من النموذج");
  return JSON.parse(match[0]) as { questions: Record<string, unknown>[] };
}

export async function generateQuestions({
  topic,
  count,
  difficulty,
  domain,
  configId,
  sourceUrls,
}: {
  topic: string;
  count: number;
  difficulty?: string;
  domain?: string;
  configId?: string;
  sourceUrls?: string[];
}) {
  const sanitizedTopic = sanitizeText(topic);
  const { model, provider } = await getActiveProvider();

  // Load config from DB
  let config = null;
  if (configId) {
    const rows = await db
      .select()
      .from(agentConfigs)
      .where(eq(agentConfigs.id, configId))
      .limit(1);
    config = rows[0] ?? null;
  }
  if (!config) config = await getActiveConfig();
  if (!config) throw new Error("لا يوجد إعداد نشط للـ agent");

  const domains = (config.activeDomains as string[]) ?? [];
  const fewShotExamples = (config.fewShotExamples as FewShotExample[]) ?? [];

  // Use stored output schema, or rebuild if missing
  const outputSchemaJson =
    config.outputSchema && Object.keys(config.outputSchema).length > 0
      ? (config.outputSchema as Record<string, unknown>)
      : buildOutputSchema(domains);

  // Search or extract from provided URLs
  let searchResults: string;
  let realUrls: string[];

  if (sourceUrls && sourceUrls.length > 0) {
    searchResults = await extractFromUrls(sourceUrls);
    realUrls = sourceUrls;
  } else {
    const [r1, r2] = await Promise.all([
      searchWeb(sanitizedTopic),
      searchWeb(`معلومات وحقائق عن ${sanitizedTopic}`),
    ]);
    searchResults = [r1, r2].filter(Boolean).join("\n\n===\n\n");
    const urlMatches = searchResults.match(/المصدر:\s*(https?:\/\/[^\s\n]+)/g) ?? [];
    realUrls = urlMatches
      .map((m) => m.replace(/^المصدر:\s*/, "").trim())
      .filter(Boolean);
  }

  const systemContent = config.systemPrompt;

  const userContent = [
    `الموضوع: "${sanitizedTopic}"`,
    `عدد الأسئلة: ${count}`,
    difficulty ? `الصعوبة: ${difficulty}` : "",
    domain ? `المجال المطلوب: ${domain}` : `المجالات المتاحة: ${domains.join("، ")}`,
    "",
    searchResults
      ? `معلومات من البحث:\n${searchResults}`
      : "استخدم معرفتك العامة.",
    "",
    realUrls.length > 0
      ? `الروابط المتاحة للمصادر (استخدم منها فقط لحقل sourceUrl — لا تخترع روابط):\n${realUrls.join("\n")}`
      : "لا توجد روابط من البحث — اترك sourceUrl فارغاً أو ضع رابط المصدر الرئيسي الموثوق فقط إن كنت متأكداً منه.",
    "",
    "ولّد الأسئلة بالعربية فقط ولا تخرج عن الموضوع المحدد.",
  ]
    .filter(Boolean)
    .join("\n");

  // Generate
  let raw: { questions: Record<string, unknown>[] };
  if (provider === "gemini") {
    raw = await generateWithGemini(model, outputSchemaJson, systemContent, userContent, config.temperature);
  } else {
    raw = await generateWithGroq(model, outputSchemaJson, fewShotExamples, sanitizedTopic, userContent, config.temperature, systemContent);
  }

  // Normalize domains — snap model output to nearest configured domain
  if (raw?.questions) {
    raw.questions = raw.questions.map((q: Record<string, unknown>) => {
      const qDomain = String(q.domain ?? "");
      const match = domains.find(
        (d) => d === qDomain || qDomain.includes(d) || d.includes(qDomain)
      );
      return { ...q, domain: match ?? (domains[0] ?? "عام") };
    });
  }

  // Validate against Zod schema with domain enum
  const validator = buildZodValidator(domains);
  const validated = validator.parse(raw);

  // Save to DB — skip duplicates via questionHash unique index
  const savedQuestions = await db
    .insert(questions)
    .values(
      validated.questions.map((q) => ({
        question: q.question,
        type: q.type as "MCQ" | "True-False" | "Short Answer",
        options: q.options,
        correctAnswer: q.correctAnswer,
        hint: q.hint,
        explanation: q.explanation,
        sourceUrl: q.sourceUrl,
        domain: q.domain,
        subdomain: q.subdomain,
        difficulty: q.difficulty as "Easy" | "Medium" | "Hard",
        status: "pending" as const,
        configId: config!.id,
        questionHash: hashQuestion(q.question),
      }))
    )
    .onConflictDoNothing()
    .returning();

  return savedQuestions;
}
