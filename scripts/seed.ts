import { db, agentConfigs } from "../lib/db";
import { eq } from "drizzle-orm";
import { buildOutputSchema, DEFAULT_FEW_SHOT_EXAMPLES, MINIMAL_SYSTEM_PROMPT } from "../lib/ai/schema-builder";

const DEFAULT_DOMAINS = [
  "العلوم", "التاريخ", "التقنية", "الجغرافيا",
  "الرياضة", "الثقافة", "الاقتصاد", "الفن والأدب",
];

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(agentConfigs).limit(1);

  if (existing.length === 0) {
    const outputSchema = buildOutputSchema(DEFAULT_DOMAINS);

    await db.insert(agentConfigs).values({
      name: "الإعداد الافتراضي",
      systemPrompt: MINIMAL_SYSTEM_PROMPT,
      temperature: 0.3,
      activeDomains: DEFAULT_DOMAINS,
      outputSchema,
      fewShotExamples: DEFAULT_FEW_SHOT_EXAMPLES,
      searchConstraints: { maxResults: 5 },
      isActive: true,
    });

    console.log("✓ Created default agent config");
  } else {
    const config = existing[0];
    const domains = (config.activeDomains as string[])?.length
      ? (config.activeDomains as string[])
      : DEFAULT_DOMAINS;

    await db
      .update(agentConfigs)
      .set({
        systemPrompt: MINIMAL_SYSTEM_PROMPT,
        temperature: 0.3,
        outputSchema: buildOutputSchema(domains),
        fewShotExamples: DEFAULT_FEW_SHOT_EXAMPLES,
        activeDomains: domains,
        updatedAt: new Date(),
      })
      .where(eq(agentConfigs.id, config.id));

    console.log("✓ Updated existing config");
    console.log("  Domains:", domains.join("، "));
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
