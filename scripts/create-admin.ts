import { db, users, accounts } from "../lib/db";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, { N: 4096, r: 8, p: 1 });
  return `${salt}:${key.toString("hex")}`;
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
