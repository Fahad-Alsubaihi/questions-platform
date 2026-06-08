export type FewShotExample = {
  question: string;
  type: "MCQ" | "True-False" | "Short Answer";
  options: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
  sourceUrl: string;
  domain: string;
  subdomain: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

// Builds a JSON Schema with domain enum injected from activeDomains
export function buildOutputSchema(domains: string[]): Record<string, unknown> {
  const domainEnum = domains.length > 0 ? domains : ["عام"];
  return {
    type: "object",
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question:      { type: "string" },
            type:          { type: "string", enum: ["MCQ", "True-False", "Short Answer"] },
            options:       { type: "array", items: { type: "string" } },
            correctAnswer: { type: "string" },
            hint:          { type: "string" },
            explanation:   { type: "string" },
            sourceUrl:     { type: "string" },
            domain:        { type: "string", enum: domainEnum },
            subdomain:     { type: "string" },
            difficulty:    { type: "string", enum: ["Easy", "Medium", "Hard"] },
          },
          required: [
            "question", "type", "options", "correctAnswer",
            "hint", "explanation", "sourceUrl", "domain", "subdomain", "difficulty",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  };
}

export const DEFAULT_FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    question: "في أي عام تأسست المملكة العربية السعودية؟",
    type: "MCQ",
    options: ["1902", "1932", "1945", "1960"],
    correctAnswer: "1932",
    hint: "السنة التي أعلن فيها الملك عبدالعزيز توحيد المملكة رسمياً",
    explanation: "في عام 1932م أعلن الملك عبدالعزيز بن عبدالرحمن آل سعود توحيد أجزاء الجزيرة العربية تحت اسم المملكة العربية السعودية.",
    sourceUrl: "ضع هنا رابطاً حقيقياً من نتائج البحث فقط",
    domain: "التاريخ",
    subdomain: "تاريخ الجزيرة العربية",
    difficulty: "Easy",
  },
  {
    question: "هل الشمس نجم أم كوكب؟",
    type: "True-False",
    options: ["صحيح", "خطأ"],
    correctAnswer: "صحيح",
    hint: "الشمس مصدر الضوء والحرارة في نظامنا الشمسي",
    explanation: "الشمس نجم من نوع القزم الأصفر يقع في مركز النظام الشمسي، وتدور حوله كواكب المجموعة الشمسية بما فيها الأرض.",
    sourceUrl: "ضع هنا رابطاً حقيقياً من نتائج البحث فقط",
    domain: "العلوم",
    subdomain: "الفلك",
    difficulty: "Easy",
  },
];

export const MINIMAL_SYSTEM_PROMPT = `أنت مولد أسئلة تريفيا احترافي. أجب بـ JSON فقط يطابق الـ schema المطلوب.

قواعد sourceUrl:
- استخدم فقط الروابط الموجودة في نتائج البحث المرفقة
- لا تخترع روابط أو تكتب روابط من ذاكرتك
- إذا لم تجد رابطاً مناسباً من البحث اترك الحقل سلسلة نصية فارغة ""`.trim();

// Formats few-shot examples as a string to inject into the prompt
export function formatFewShotExamples(examples: FewShotExample[]): string {
  return `أمثلة على المطلوب:\n${JSON.stringify({ questions: examples }, null, 2)}`;
}
