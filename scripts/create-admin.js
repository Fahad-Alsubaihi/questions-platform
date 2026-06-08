/* eslint-disable @typescript-eslint/no-require-imports */
const { Pool } = require("pg");
const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 4096, r: 8, p: 1,
  });
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const email = "admin@trivia.local";
    const password = "Admin1234!";

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      await pool.query('UPDATE users SET role = $1 WHERE email = $2', ["admin", email]);
      console.log("✓ Admin already exists — role updated to admin.");
      return;
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const hashed = hashPassword(password);

    await pool.query(
      `INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, "Admin", email, new Date(), "admin"]
    );

    await pool.query(
      `INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [accountId, userId, "credential", userId, hashed]
    );

    console.log("✓ Admin user created:");
    console.log("  Email:    admin@trivia.local");
    console.log("  Password: Admin1234!");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
