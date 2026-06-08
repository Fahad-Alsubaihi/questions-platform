ALTER TABLE "questions" ADD COLUMN "question_hash" text;
CREATE UNIQUE INDEX "questions_question_hash_unique" ON "questions" ("question_hash") WHERE question_hash IS NOT NULL;
