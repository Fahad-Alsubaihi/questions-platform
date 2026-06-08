import { db, users, accounts } from "../lib/db";
import { eq } from "drizzle-orm";
import { scrypt } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";

function hashPassword(password: string): string {
  const salt = bytesToHex(randomBytes(16));
  const key = scrypt(password.normalize("NFKC"), salt, {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
  });
  return `${salt}:${bytesToHex(key)}`;
}

async function createAdmin() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@trivia.local"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.email, "admin@trivia.local"));
    console.log("Admin already exists — ensured role=admin.");
    process.exit(0);
  }

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const hashedPassword = hashPassword("Admin1234!");

  await db.insert(users).values({
    id: userId,
    name: "Admin",
    email: "admin@trivia.local",
    emailVerified: new Date(),
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(accounts).values({
    id: accountId,
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✓ Admin user created successfully:");
  console.log("  Email:    admin@trivia.local");
  console.log("  Password: Admin1234!");
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
