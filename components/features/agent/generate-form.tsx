"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, CheckCircle } from "lucide-react";
import { agentGenerateSchema } from "@/lib/validations/question";
import { z } from "zod";

type GenerateFormValues = z.input<typeof agentGenerateSchema>;

export function GenerateForm() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resultCount, setResultCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(agentGenerateSchema),
    defaultValues: { count: 5 },
  });

  async function onSubmit(data: GenerateFormValues) {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "فشل التوليد");
      }

      setResultCount(json.data?.length ?? 0);
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      reset();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "خطأ غير متوقع");
      setStatus("error");
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      {status === "success" && (
        <div className="flex items-center gap-2 rounded-md bg-success-bg dark:bg-success/10 border border-success/40 dark:border-success/30 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-success shrink-0" />
          <p className="text-sm text-success">
            تم توليد {resultCount} سؤال وإضافتها لطابور المراجعة بنجاح.
          </p>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3">
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            الموضوع <span className="text-destructive">*</span>
          </label>
          <input
            {...register("topic")}
            placeholder="مثال: التاريخ الإسلامي، الفيزياء الكمية، البرمجة بالبايثون"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.topic && (
            <p className="text-xs text-destructive">{errors.topic.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">عدد الأسئلة</label>
            <input
              type="number"
              min={1}
              max={20}
              {...register("count", { valueAsNumber: true })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.count && (
              <p className="text-xs text-destructive">{errors.count.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">مستوى الصعوبة (اختياري)</label>
            <select
              {...register("difficulty")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">أي مستوى</option>
              <option value="Easy">سهل</option>
              <option value="Medium">متوسط</option>
              <option value="Hard">صعب</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">المجال (اختياري)</label>
          <input
            {...register("domain")}
            placeholder="مثال: العلوم، التاريخ، التقنية"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={status === "loading"}
            className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <Sparkles className="h-4 w-4" />
            {status === "loading" ? "جاري التوليد…" : "توليد الأسئلة"}
          </button>
          {status === "loading" && (
            <p className="text-xs text-muted-foreground mt-2">
              قد يستغرق هذا من 20 إلى 60 ثانية أثناء بحث الذكاء الاصطناعي في الإنترنت…
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
