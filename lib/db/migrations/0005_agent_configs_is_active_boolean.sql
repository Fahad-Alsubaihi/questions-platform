ALTER TABLE "agent_configs" ALTER COLUMN "is_active" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "agent_configs"
  ALTER COLUMN "is_active" TYPE boolean USING (
    CASE
      WHEN lower("is_active"::text) IN ('true', 't', '1') THEN true
      ELSE false
    END
  );
--> statement-breakpoint
ALTER TABLE "agent_configs" ALTER COLUMN "is_active" SET DEFAULT true;
