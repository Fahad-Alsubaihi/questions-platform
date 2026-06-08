const { Pool } = require("pg");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function hashQuestion(text) {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[ؐ-ًؚ-ٟ]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const filePath = path.join(__dirname, "questions.json");
    const questions = JSON.parse(fs.readFileSync(filePath, "utf8"));

    console.log(`📥 Importing ${questions.length} questions...`);

    let imported = 0;
    let skipped = 0;

    for (const q of questions) {
      const hash = hashQuestion(q.question);
      try {
        await pool.query(
          `INSERT INTO questions
            (id, question, type, options, correct_answer, hint, explanation,
             source_url, domain, subdomain, difficulty, status, question_hash,
             created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
           ON CONFLICT (question_hash) DO NOTHING`,
          [
            crypto.randomUUID(),
            q.question,
            "Short Answer",
            JSON.stringify([]),
            q.correctAnswer,
            "",
            "",
            "",
            q.domain,
            "",
            q.difficulty,
            "approved",
            hash,
          ]
        );
        imported++;
      } catch {
        skipped++;
      }
    }

    console.log(`✅ Imported: ${imported}`);
    if (skipped > 0) console.log(`⏭  Skipped (duplicates): ${skipped}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
