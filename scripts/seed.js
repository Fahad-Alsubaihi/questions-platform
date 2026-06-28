/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const { randomUUID } = require("crypto");

const DEFAULT_DOMAINS = [
  "العلوم", "التاريخ", "التقنية", "الجغرافيا",
  "الرياضة", "الثقافة", "الاقتصاد", "الفن والأدب",
];

const SYSTEM_PROMPT = `أنت مولد أسئلة تريفيا احترافي. أجب بـ JSON فقط يطابق الـ schema المطلوب.

قواعد sourceUrl:
- استخدم فقط الروابط الموجودة في نتائج البحث المرفقة
- لا تخترع روابط أو تكتب روابط من ذاكرتك
- إذا لم تجد رابطاً مناسباً من البحث اترك الحقل سلسلة نصية فارغة ""`;

function buildOutputSchema(domains) {
  const domainEnum = domains.length > 0 ? domains : ["عام"];
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question:      { type: "string" },
            type:          { type: "string", enum: ["MCQ", "True-False", "Short Answer"] },
            options:       { type: "array", items: { type: "string" } },
            correctAnswer: { type: "string" },
            hint:          { type: "string" },
            explanation:   { type: "string" },
            sourceUrl:     { type: "string" },
            domain:        { type: "string", enum: domainEnum },
            subdomain:     { type: "string" },
            difficulty:    { type: "string", enum: ["Easy", "Medium", "Hard"] },
          },
          required: [
            "question", "type", "options", "correctAnswer",
            "hint", "explanation", "sourceUrl", "domain", "subdomain", "difficulty",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  };
}

const FEW_SHOT_EXAMPLES = [
  {
    question: "في أي عام تأسست المملكة العربية السعودية؟",
    type: "MCQ",
    options: ["1902", "1932", "1945", "1960"],
    correctAnswer: "1932",
    hint: "السنة التي أعلن فيها الملك عبدالعزيز توحيد المملكة رسمياً",
    explanation: "في عام 1932م أعلن الملك عبدالعزيز بن عبدالرحمن آل سعود توحيد أجزاء الجزيرة العربية تحت اسم المملكة العربية السعودية.",
    sourceUrl: "",
    domain: "التاريخ",
    subdomain: "تاريخ الجزيرة العربية",
    difficulty: "Easy",
  },
  {
    question: "هل الشمس نجم أم كوكب؟",
    type: "True-False",
    options: ["صحيح", "خطأ"],
    correctAnswer: "صحيح",
    hint: "الشمس مصدر الضوء والحرارة في نظامنا الشمسي",
    explanation: "الشمس نجم من نوع القزم الأصفر يقع في مركز النظام الشمسي.",
    sourceUrl: "",
    domain: "العلوم",
    subdomain: "الفلك",
    difficulty: "Easy",
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const { rows } = await pool.query("SELECT id FROM agent_configs LIMIT 1");

    if (rows.length > 0) {
      console.log("✓ Agent config already exists — skipping seed.");
      return;
    }

    const outputSchema = buildOutputSchema(DEFAULT_DOMAINS);

    await pool.query(
      `INSERT INTO agent_configs
        (id, name, system_prompt, temperature, active_domains, output_schema, few_shot_examples, search_constraints, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        randomUUID(),
        "الإعداد الافتراضي",
        SYSTEM_PROMPT,
        0.3,
        JSON.stringify(DEFAULT_DOMAINS),
        JSON.stringify(outputSchema),
        JSON.stringify(FEW_SHOT_EXAMPLES),
        JSON.stringify({ maxResults: 5 }),
        true,
      ]
    );

    console.log("✓ Default agent config created.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
