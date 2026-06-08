"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X, Pencil, ExternalLink, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { questionSchema } from "@/lib/validations/question";
import { z } from "zod";
import { formatDate, cn } from "@/lib/utils";
import type { Question } from "@/lib/db/schema";
import type { QuestionInput } from "@/lib/validations/question";

type QuestionFormValues = z.input<typeof questionSchema>;

interface QuestionCardProps {
  question: Question;
  onApprove: () => void;
  onReject: () => void;
  onEdit: (data: Partial<QuestionInput>) => void;
  isPending: boolean;
}

const difficultyStyle = {
  Easy:   "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30",
  Medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  Hard:   "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30",
};

const difficultyAr = { Easy: "سهل", Medium: "متوسط", Hard: "صعب" };
const typeAr: Record<string, string> = {
  MCQ: "اختيار متعدد",
  "True-False": "صح/خطأ",
  "Short Answer": "إجابة قصيرة",
};

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const labelCls = "text-xs font-medium text-muted-foreground";

export function QuestionCard({
  question,
  onApprove,
  onReject,
  onEdit,
  isPending,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: question.question,
      type: question.type,
      options: (question.options as string[])?.length ? (question.options as string[]) : ["", "", "", ""],
      correctAnswer: question.correctAnswer,
      hint: question.hint,
      explanation: question.explanation,
      sourceUrl: question.sourceUrl,
      domain: question.domain,
      subdomain: question.subdomain,
      difficulty: question.difficulty,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "options" as never });
  const watchedType = watch("type");
  const watchedOptions = watch("options");

  function onEditSubmit(data: QuestionFormValues) {
    const cleaned = {
      ...data,
      options: watchedType === "MCQ" ? data.options?.filter((o) => o.trim() !== "") : [],
    };
    onEdit(cleaned);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-primary/40 bg-card shadow-md">
        <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-xl">
          <h3 className="font-semibold text-foreground">تعديل السؤال</h3>
          <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onEditSubmit)} className="p-4 space-y-4">
          {/* Question text */}
          <div className="space-y-1">
            <label className={labelCls}>نص السؤال</label>
            <textarea
              {...register("question")}
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
            {errors.question && <p className="text-xs text-destructive">{errors.question.message}</p>}
          </div>

          {/* Type + Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>نوع السؤال</label>
              <select {...register("type")} className={inputCls}>
                <option value="MCQ">اختيار متعدد</option>
                <option value="True-False">صح / خطأ</option>
                <option value="Short Answer">إجابة قصيرة</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>الصعوبة</label>
              <select {...register("difficulty")} className={inputCls}>
                <option value="Easy">سهل</option>
                <option value="Medium">متوسط</option>
                <option value="Hard">صعب</option>
              </select>
            </div>
          </div>

          {/* MCQ Options */}
          {watchedType === "MCQ" && (
            <div className="space-y-2">
              <label className={labelCls}>الخيارات</label>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    <input
                      {...register(`options.${i}` as const)}
                      placeholder={`الخيار ${String.fromCharCode(65 + i)}`}
                      className={cn(inputCls, "flex-1")}
                    />
                    {fields.length > 2 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {fields.length < 6 && (
                <button
                  type="button"
                  onClick={() => append("")}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة خيار
                </button>
              )}
            </div>
          )}

          {/* Correct Answer */}
          <div className="space-y-1">
            <label className={labelCls}>الإجابة الصحيحة</label>
            {watchedType === "MCQ" ? (
              <select {...register("correctAnswer")} className={inputCls}>
                <option value="">— اختر —</option>
                {(watchedOptions ?? [])
                  .filter((o) => o?.trim())
                  .map((opt, i) => (
                    <option key={i} value={opt}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </option>
                  ))}
              </select>
            ) : watchedType === "True-False" ? (
              <select {...register("correctAnswer")} className={inputCls}>
                <option value="صحيح">صحيح</option>
                <option value="خطأ">خطأ</option>
              </select>
            ) : (
              <input {...register("correctAnswer")} className={inputCls} />
            )}
            {errors.correctAnswer && <p className="text-xs text-destructive">{errors.correctAnswer.message}</p>}
          </div>

          {/* Domain + Subdomain */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>المجال</label>
              <input {...register("domain")} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>المجال الفرعي</label>
              <input {...register("subdomain")} className={inputCls} />
            </div>
          </div>

          {/* Hint */}
          <div className="space-y-1">
            <label className={labelCls}>التلميح</label>
            <input {...register("hint")} className={inputCls} />
          </div>

          {/* Explanation */}
          <div className="space-y-1">
            <label className={labelCls}>الشرح</label>
            <textarea {...register("explanation")} rows={2} className={cn(inputCls, "resize-none")} />
          </div>

          {/* Source URL */}
          <div className="space-y-1">
            <label className={labelCls}>رابط المصدر</label>
            <input {...register("sourceUrl")} dir="ltr" className={inputCls} />
            {errors.sourceUrl && <p className="text-xs text-destructive">{errors.sourceUrl.message}</p>}
          </div>

          <div className="flex justify-start gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-4 space-y-3">
        {/* Tags row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {typeAr[question.type] ?? question.type}
            </span>
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", difficultyStyle[question.difficulty])}>
              {difficultyAr[question.difficulty]}
            </span>
            {question.domain && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                {question.domain}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
            {formatDate(question.createdAt)}
          </span>
        </div>

        {/* Question text */}
        <p className="text-sm font-semibold text-foreground leading-relaxed">
          {question.question}
        </p>

        {/* MCQ options */}
        {question.type === "MCQ" && (
          <div className="grid grid-cols-2 gap-2">
            {((question.options as string[]) ?? []).map((opt, i) => {
              const isCorrect = opt === question.correctAnswer;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-colors",
                    isCorrect
                      ? "border-success/40 bg-success-bg text-success dark:border-success/30 dark:bg-success/10 dark:text-success font-medium"
                      : "border-border bg-muted/40 text-muted-foreground"
                  )}
                >
                  {isCorrect && <Check className="h-3 w-3 shrink-0" />}
                  <span>{String.fromCharCode(65 + i)}. {opt}</span>
                </div>
              );
            })}
          </div>
        )}

        {question.type === "True-False" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">الإجابة:</span>
            <span className="font-semibold px-2 py-0.5 rounded bg-success-bg text-success dark:bg-success/10 dark:text-success border border-success/40 dark:border-success/30">
              {question.correctAnswer}
            </span>
          </div>
        )}

        {/* Toggle details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
        </button>

        {showDetails && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            {question.hint && (
              <div className="text-xs bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2">
                <span className="font-semibold text-amber-600 dark:text-amber-400">💡 التلميح: </span>
                <span className="text-foreground/80">{question.hint}</span>
              </div>
            )}
            {question.explanation && (
              <div className="text-xs bg-sky-500/8 border border-sky-500/20 rounded-lg px-3 py-2">
                <span className="font-semibold text-sky-600 dark:text-sky-400">📖 الشرح: </span>
                <span className="text-foreground/80">{question.explanation}</span>
              </div>
            )}
            {question.sourceUrl && (
              <a
                href={question.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                dir="ltr"
              >
                <ExternalLink className="h-3 w-3" />
                المصدر
              </a>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-border/60 flex items-center gap-2 bg-muted/20 rounded-b-xl">
        <button
          onClick={onApprove}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
        >
          <Check className="h-3.5 w-3.5" />
          اعتماد
        </button>
        <button
          onClick={onReject}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-sm"
        >
          <X className="h-3.5 w-3.5" />
          رفض
        </button>
        <button
          onClick={() => setIsEditing(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-accent text-foreground disabled:opacity-50 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </button>
      </div>
    </div>
  );
}
