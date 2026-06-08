"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, CheckCircle, Link, Plus, X } from "lucide-react";
import { agentGenerateSchema } from "@/lib/validations/question";
import { useAgentConfig } from "@/hooks/useAgentConfig";
import { z } from "zod";

type GenerateFormValues = z.input<typeof agentGenerateSchema>;

export function GenerateForm() {
  const queryClient = useQueryClient();
  const { configs } = useAgentConfig();
  const activeConfig = configs.find((c) => c.isActive === "true");
  const activeDomains = (activeConfig?.activeDomains as string[]) ?? [];

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resultCount, setResultCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [urlError, setUrlError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GenerateFormValues>({
    resolver: zodResolver(agentGenerateSchema),
    defaultValues: { count: 5 },
  });

  function addUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setUrlError("رابط غير صالح");
      return;
    }
    if (sourceUrls.length >= 5) {
      setUrlError("الحد الأقصى ٥ روابط");
      return;
    }
    if (sourceUrls.includes(trimmed)) {
      setUrlError("الرابط مضاف مسبقاً");
      return;
    }
    setSourceUrls((prev) => [...prev, trimmed]);
    setUrlInput("");
    setUrlError(null);
  }

  function removeUrl(url: string) {
    setSourceUrls((prev) => prev.filter((u) => u !== url));
  }

  async function onSubmit(data: GenerateFormValues) {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(typeof json.error === "string" ? json.error : "فشل التوليد");
      }

      setResultCount(json.data?.length ?? 0);
      setStatus("success");
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      reset();
      setSourceUrls([]);
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

        {activeDomains.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">المجال (اختياري)</label>
            <select
              {...register("domain")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">كل المجالات</option>
              {activeDomains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        {/* Source URLs */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Link className="h-3.5 w-3.5 text-muted-foreground" />
            روابط المصدر (اختياري — بدلاً من البحث العام)
          </label>
          <p className="text-xs text-muted-foreground">
            أضف روابط مواقع أو صفحات معينة ليستخرج منها الأسئلة مباشرة. حد أقصى ٥ روابط.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
              placeholder="https://example.com/page"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={addUrl}
              disabled={sourceUrls.length >= 5}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              إضافة
            </button>
          </div>

          {urlError && <p className="text-xs text-destructive">{urlError}</p>}

          {sourceUrls.length > 0 && (
            <ul className="space-y-1.5">
              {sourceUrls.map((url) => (
                <li key={url} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
                  <span className="flex-1 text-xs text-foreground truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeUrl(url)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
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
              {sourceUrls.length > 0
                ? "جاري استخراج المحتوى من الروابط وتوليد الأسئلة…"
                : "قد يستغرق هذا من 20 إلى 60 ثانية أثناء بحث الذكاء الاصطناعي في الإنترنت…"}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
