import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  real,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const questionStatusEnum = pgEnum("question_status", [
  "pending",
  "approved",
  "rejected",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "MCQ",
  "True-False",
  "Short Answer",
]);

export const difficultyEnum = pgEnum("difficulty", [
  "Easy",
  "Medium",
  "Hard",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "approve",
  "reject",
  "edit",
]);

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

// Better Auth manages the users table — we extend it with a role column
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const providerEnum = pgEnum("ai_provider", ["gemini", "groq", "tavily"]);

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: providerEnum("provider").notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  model: text("model").notNull().default(""),
  isActive: boolean("is_active").notNull().default(false),
  label: text("label").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;

export const agentConfigs = pgTable("agent_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Default Config"),
  systemPrompt: text("system_prompt").notNull(),
  temperature: real("temperature").notNull().default(0.3),
  activeDomains: jsonb("active_domains").$type<string[]>().default([]),
  // Rebuilt automatically when activeDomains changes
  outputSchema: jsonb("output_schema").$type<Record<string, unknown>>().default({}),
  // 2 Arabic few-shot examples shown to the model
  fewShotExamples: jsonb("few_shot_examples").$type<Record<string, unknown>[]>().default([]),
  searchConstraints: jsonb("search_constraints").$type<Record<string, unknown>>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  type: questionTypeEnum("type").notNull(),
  options: jsonb("options").$type<string[]>().default([]),
  correctAnswer: text("correct_answer").notNull(),
  hint: text("hint").notNull().default(""),
  explanation: text("explanation").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  domain: text("domain").notNull().default(""),
  subdomain: text("subdomain").notNull().default(""),
  difficulty: difficultyEnum("difficulty").notNull(),
  status: questionStatusEnum("status").notNull().default("pending"),
  configId: uuid("config_id").references(() => agentConfigs.id),
  reviewedBy: text("reviewed_by").references(() => users.id),
  questionHash: text("question_hash"),
  exportedAt: timestamp("exported_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: auditActionEnum("action").notNull(),
  questionId: uuid("question_id").references(() => questions.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  auditLogs: many(auditLogs),
  reviewedQuestions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  config: one(agentConfigs, {
    fields: [questions.configId],
    references: [agentConfigs.id],
  }),
  reviewer: one(users, {
    fields: [questions.reviewedBy],
    references: [users.id],
  }),
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  question: one(questions, {
    fields: [auditLogs.questionId],
    references: [questions.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type AgentConfig = typeof agentConfigs.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type NewAgentConfig = typeof agentConfigs.$inferInsert;
