import * as xlsx from "xlsx";
import * as path from "path";
import { db } from "../lib/db";
import { questions } from "../lib/db/schema";
import { hashQuestion } from "../lib/utils";

const DIFFICULTY_MAP: Record<string, "Easy" | "Medium" | "Hard"> = {
  "سهل": "Easy",
  "متوسط": "Medium",
  "صعب": "Hard",
  "غير محدد": "Medium",
};

async function importQuestions() {
  const filePath = path.join(__dirname, "questions.xlsx");
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets["كل الأسئلة"];
  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws);

  const toInsert = rows
    .filter((row) => row["السؤال"] && row["الإجابة"])
    .map((row) => {
      const questionText = String(row["السؤال"]).trim();
      return {
        question: questionText,
        type: "Short Answer" as const,
        options: [] as string[],
        correctAnswer: String(row["الإجابة"]).trim(),
        hint: "",
        explanation: "",
        sourceUrl: "",
        domain: String(row["المجال"] ?? "").trim(),
        subdomain: "",
        difficulty: DIFFICULTY_MAP[String(row["الصعوبة"] ?? "").trim()] ?? "Medium",
        status: "approved" as const,
        questionHash: hashQuestion(questionText),
      };
    });

  console.log(`📥 محاولة استيراد ${toInsert.length} سؤال...`);

  const inserted = await db
    .insert(questions)
    .values(toInsert)
    .onConflictDoNothing({ target: questions.questionHash })
    .returning({ id: questions.id });

  const skipped = toInsert.length - inserted.length;

  console.log(`✅ تم استيراد: ${inserted.length} سؤال`);
  if (skipped > 0) console.log(`⏭️  تم تخطي (مكررة): ${skipped} سؤال`);

  process.exit(0);
}

importQuestions().catch((err) => {
  console.error("❌ فشل الاستيراد:", err.message);
  process.exit(1);
});
