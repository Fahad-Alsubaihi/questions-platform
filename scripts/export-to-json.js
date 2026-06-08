const xlsx = require("xlsx");
const fs = require("fs");
const path = require("path");

const wb = xlsx.readFile(path.join(__dirname, "questions.xlsx"));
const ws = wb.Sheets["كل الأسئلة"];
const rows = xlsx.utils.sheet_to_json(ws);

const difficultyMap = {
  "سهل": "Easy",
  "متوسط": "Medium",
  "صعب": "Hard",
  "غير محدد": "Medium",
};

const questions = rows
  .filter((r) => r["السؤال"] && r["الإجابة"])
  .map((r) => ({
    question: String(r["السؤال"]).trim(),
    correctAnswer: String(r["الإجابة"]).trim(),
    domain: String(r["المجال"] || "").trim(),
    difficulty: difficultyMap[String(r["الصعوبة"] || "").trim()] || "Medium",
  }));

fs.writeFileSync(
  path.join(__dirname, "questions.json"),
  JSON.stringify(questions, null, 2)
);

console.log("✅ Exported", questions.length, "questions to scripts/questions.json");
