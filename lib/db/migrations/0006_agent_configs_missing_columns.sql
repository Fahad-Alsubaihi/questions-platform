ALTER TABLE "agent_configs" ADD COLUMN IF NOT EXISTS "output_schema" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "agent_configs" ADD COLUMN IF NOT EXISTS "few_shot_examples" jsonb DEFAULT '[]'::jsonb;
