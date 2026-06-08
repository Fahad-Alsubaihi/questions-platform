"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ExternalLink, Upload, CheckCircle, Loader2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Question } from "@/lib/db/schema";

async function fetchApprovedQuestions(): Promise<Question[]> {
  const res = await fetch("/api/questions?status=approved");
  if (!res.ok) throw new Error("فشل التحميل");
  return (await res.json()).data;
}

const difficultyColors = {
  Easy: "text-success bg-success-bg dark:text-success dark:bg-success/10",
  Medium: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20",
  Hard: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20",
};

const difficultyAr = { Easy: "سهل", Medium: "متوسط", Hard: "صعب" };
const typeAr: Record<string, string> = {
  MCQ: "اختيار متعدد",
  "True-False": "صح/خطأ",
  "Short Answer": "إجابة قصيرة",
};

async function fetchExportStats(): Promise<{ total: number; notExported: number }> {
  const res = await fetch("/api/export");
  if (!res.ok) return { total: 0, notExported: 0 };
  return (await res.json()).data;
}

export function ApprovedLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterType, setFilterType] = useState("");
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const { data: questions, isLoading, isError } = useQuery({
    queryKey: ["questions", "approved"],
    queryFn: fetchApprovedQuestions,
  });

  const { data: exportStats } = useQuery({
    queryKey: ["export-stats"],
    queryFn: fetchExportStats,
  });

  const exportMutation = useMutation({
    mutationFn: async (onlyNew: boolean) => {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlyNew }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "فشل التصدير");
      return json.data as { exported: number; message: string };
    },
    onSuccess: (data) => {
      setExportMsg(data.message);
      queryClient.invalidateQueries({ queryKey: ["questions", "approved"] });
      queryClient.invalidateQueries({ queryKey: ["export-stats"] });
      setTimeout(() => setExportMsg(null), 4000);
    },
  });

  const filtered = (questions ?? []).filter((q) => {
    const matchSearch =
      !search ||
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.domain.toLowerCase().includes(search.toLowerCase());
    const matchDiff = !filterDifficulty || q.difficulty === filterDifficulty;
    const matchType = !filterType || q.type === filterType;
    return matchSearch && matchDiff && matchType;
  });

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">فشل تحميل الأسئلة</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Export bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {exportStats ? (
            <>
              <span className="text-foreground font-medium">{exportStats.notExported}</span> سؤال لم يُصدَّر بعد
              {" · "}
              <span className="text-foreground font-medium">{exportStats.total}</span> إجمالي
            </>
          ) : "جاري التحميل…"}
        </div>
        <div className="flex items-center gap-2">
          {exportMsg && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle className="h-3.5 w-3.5" />
              {exportMsg}
            </span>
          )}
          {exportMutation.isError && (
            <span className="text-xs text-destructive">
              {(exportMutation.error as Error).message}
            </span>
          )}
          <button
            onClick={() => exportMutation.mutate(true)}
            disabled={exportMutation.isPending || exportStats?.notExported === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {exportMutation.isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Upload className="h-3.5 w-3.5" />}
            تصدير الجديدة
          </button>
          <button
            onClick={() => exportMutation.mutate(false)}
            disabled={exportMutation.isPending || exportStats?.total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            تصدير الكل
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الأسئلة…"
            className="w-full pr-9 pl-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">كل المستويات</option>
          <option value="Easy">سهل</option>
          <option value="Medium">متوسط</option>
          <option value="Hard">صعب</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">كل الأنواع</option>
          <option value="MCQ">اختيار متعدد</option>
          <option value="True-False">صح/خطأ</option>
          <option value="Short Answer">إجابة قصيرة</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} سؤال
        {questions && filtered.length !== questions.length
          ? ` (مفلتر من ${questions.length})`
          : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">لا توجد أسئلة</p>
          <p className="text-sm text-muted-foreground mt-1">
            {questions?.length === 0
              ? "اعتمد أسئلة من طابور المراجعة"
              : "جرّب تعديل الفلاتر"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((q) => (
            <div key={q.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  {q.question}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {typeAr[q.type] ?? q.type}
                  </span>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", difficultyColors[q.difficulty])}>
                    {difficultyAr[q.difficulty]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>
                  الإجابة:{" "}
                  <span className="text-foreground font-medium">{q.correctAnswer}</span>
                </span>
                {q.domain && <span>{q.domain}</span>}
                <span>{formatDate(q.createdAt)}</span>
                {q.sourceUrl && (
                  <a
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    dir="ltr"
                  >
                    <ExternalLink className="h-3 w-3" />
                    المصدر
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
