import { z } from "zod";

export const questionSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  type: z.enum(["MCQ", "True-False", "Short Answer"]),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  hint: z.string().default(""),
  explanation: z.string().default(""),
  sourceUrl: z.string().url().or(z.literal("")).default(""),
  domain: z.string().default(""),
  subdomain: z.string().default(""),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
});

export const agentGenerateSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters").max(200),
  count: z.number().int().min(1, "Min 1").max(20, "Max 20").default(5),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  domain: z.string().optional(),
});

export const agentConfigSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string().min(1),
  temperature: z.number().min(0, "Min 0").max(2, "Max 2"),
  activeDomains: z.array(z.string()).default([]),
  searchConstraints: z.record(z.string(), z.unknown()).default({}),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type AgentGenerateInput = z.infer<typeof agentGenerateSchema>;
export type AgentConfigInput = z.infer<typeof agentConfigSchema>;
