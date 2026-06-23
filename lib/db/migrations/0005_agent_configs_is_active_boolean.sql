ALTER TABLE "agent_configs"
  ALTER COLUMN "is_active" TYPE boolean USING (
    CASE
      WHEN lower("is_active") IN ('true', 't', '1') THEN true
      ELSE false
    END
  );

ALTER TABLE "agent_configs"
  ALTER COLUMN "is_active" SET DEFAULT true;
