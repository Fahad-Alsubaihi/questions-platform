/* eslint-disable @typescript-eslint/no-require-imports */
// Runs SQL migration files in order — used inside the Docker container at startup
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS __migrations (
        id SERIAL PRIMARY KEY,
        tag TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, "..", "lib", "db", "migrations");
    const journal = JSON.parse(
      fs.readFileSync(path.join(migrationsDir, "meta", "_journal.json"), "utf8")
    );

    for (const entry of journal.entries) {
      const tag = entry.tag;

      // Skip if already applied
      const { rows } = await pool.query(
        "SELECT id FROM __migrations WHERE tag = $1",
        [tag]
      );
      if (rows.length > 0) {
        console.log(`⏭  Already applied: ${tag}`);
        continue;
      }

      const sqlFile = path.join(migrationsDir, `${tag}.sql`);
      if (!fs.existsSync(sqlFile)) {
        console.warn(`⚠  File not found: ${tag}.sql — skipping`);
        continue;
      }

      const sql = fs.readFileSync(sqlFile, "utf8");
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const stmt of statements) {
        await pool.query(stmt);
      }

      await pool.query("INSERT INTO __migrations (tag) VALUES ($1)", [tag]);
      console.log(`✅ Applied: ${tag}`);
    }

    console.log("🚀 Migrations complete");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
