import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      async hash(password) {
        const { scryptSync, randomBytes } = await import("crypto");
        const salt = randomBytes(16).toString("hex");
        const key = scryptSync(password.normalize("NFKC"), salt, 64, { N: 4096, r: 8, p: 1 });
        return `${salt}:${key.toString("hex")}`;
      },
      async verify({ hash, password }) {
        const { scryptSync, timingSafeEqual } = await import("crypto");
        const [salt, storedKey] = hash.split(":");
        const key = scryptSync(password.normalize("NFKC"), salt, 64, { N: 4096, r: 8, p: 1 });
        return timingSafeEqual(Buffer.from(storedKey, "hex"), key);
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        input: false,
      },
    },
  },
  plugins: [admin()],
});

export type Session = typeof auth.$Infer.Session;
