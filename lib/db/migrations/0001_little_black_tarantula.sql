CREATE TYPE "public"."ai_provider" AS ENUM('gemini', 'groq');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"encrypted_key" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
