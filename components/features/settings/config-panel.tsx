"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Plus, X, CheckCircle, RefreshCw, Tag, Pencil } from "lucide-react";
import { agentConfigSchema, type AgentConfigInput } from "@/lib/validations/question";
import { z } from "zod";
import type { AgentConfig } from "@/lib/db/schema";
import type { FewShotExample } from "@/lib/ai/schema-builder";

type ConfigFormValues = z.input<typeof agentConfigSchema>;

async function fetchConfigs(): Promise<AgentConfig[]> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("فشل التحميل");
  return (await res.json()).data;
}

export function ConfigPanel() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [editingDomain, setEditingDomain] = useState<{ idx: number; val: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"prompt" | "domains" | "examples">("domains");

  const { data: configs, isLoading } = useQuery({ queryKey: ["configs"], queryFn: fetchConfigs });
  const selectedConfig = configs?.find((c) => c.id === selectedId) ?? configs?.[0];

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } =
    useForm<ConfigFormValues>({ resolver: zodResolver(agentConfigSchema) });

  const activeDomains = (watch("activeDomains") ?? []) as string[];

  useEffect(() => {
    if (selectedConfig) {
      reset({
        name: selectedConfig.name,
        systemPrompt: selectedConfig.systemPrompt,
        temperature: selectedConfig.temperature,
        activeDomains: (selectedConfig.activeDomains as string[]) ?? [],
        searchConstraints: (selectedConfig.searchConstraints as Record<string, unknown>) ?? {},
      });
    }
  }, [selectedConfig, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: AgentConfigInput) => {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedConfig!.id, ...data }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "إعداد جديد",
          systemPrompt: "أنت مولد أسئلة. أجب بـ JSON فقط.",
          temperature: 0.3,
          activeDomains: ["عام"],
          searchConstraints: {},
        }),
      });
      if (!res.ok) throw new Error("فشل الإنشاء");
      return res.json();
    },
    onSuccess: (data: { data: AgentConfig }) => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      setSelectedId(data.data.id);
    },
  });

  function addDomain() {
    const trimmed = domainInput.trim();
    if (trimmed && !activeDomains.includes(trimmed)) {
      setValue("activeDomains", [...activeDomains, trimmed], { shouldDirty: true });
    }
    setDomainInput("");
  }

  function removeDomain(idx: number) {
    setValue("activeDomains", activeDomains.filter((_, i) => i !== idx), { shouldDirty: true });
  }

  function saveEditDomain() {
    if (!editingDomain) return;
    const updated = [...activeDomains];
    updated[editingDomain.idx] = editingDomain.val.trim();
    setValue("activeDomains", updated, { shouldDirty: true });
    setEditingDomain(null);
  }

  const fewShot = (selectedConfig?.fewShotExamples as FewShotExample[] | undefined) ?? [];
  const outputSchema = selectedConfig?.outputSchema;

  if (isLoading) return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Config tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {configs?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                (selectedConfig?.id ?? "") === c.id
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-dashed border-border text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          جديد
        </button>
      </div>

      {!selectedConfig ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">لا توجد إعدادات.</p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((data) => saveMutation.mutate(data as AgentConfigInput))}
          className="space-y-4"
        >
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                تم الحفظ — تم إعادة بناء الـ schema تلقائياً
              </p>
            </div>
          )}

          {/* Config name + temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">اسم الإعداد</label>
              <input
                {...register("name")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                درجة الحرارة
                <span className="text-xs text-muted-foreground font-normal mr-1">(0 = محدد، 2 = إبداعي)</span>
              </label>
              <input
                type="number" step="0.1" min="0" max="2"
                {...register("temperature", { valueAsNumber: true })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.temperature && <p className="text-xs text-destructive">{errors.temperature.message}</p>}
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 border-b border-border">
            {(["domains", "prompt", "examples"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "domains" ? "المجالات" : tab === "prompt" ? "System Prompt" : "أمثلة التوليد"}
              </button>
            ))}
          </div>

          {/* Domains tab */}
          {activeTab === "domains" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                المجالات هي المصدر الوحيد للحقيقة — تُبنى منها الـ schema وتُقيّد مخرجات الـ AI. أي تغيير يُعيد بناء الـ schema تلقائياً.
              </p>

              {/* Add domain */}
              <div className="flex gap-2">
                <input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDomain(); } }}
                  placeholder="أضف مجالاً جديداً…"
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button" onClick={addDomain}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
                >
                  إضافة
                </button>
              </div>

              {/* Domains list */}
              <div className="space-y-2">
                {activeDomains.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد مجالات — أضف مجالاً للبدء</p>
                )}
                {activeDomains.map((domain, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-background">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {editingDomain?.idx === idx ? (
                      <>
                        <input
                          value={editingDomain.val}
                          onChange={(e) => setEditingDomain({ idx, val: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEditDomain(); } }}
                          className="flex-1 rounded border border-ring bg-background px-2 py-0.5 text-sm focus:outline-none"
                          autoFocus
                        />
                        <button type="button" onClick={saveEditDomain} className="text-xs text-primary hover:underline">حفظ</button>
                        <button type="button" onClick={() => setEditingDomain(null)} className="text-xs text-muted-foreground hover:underline">إلغاء</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-foreground">{domain}</span>
                        <button
                          type="button"
                          onClick={() => setEditingDomain({ idx, val: domain })}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDomain(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Current schema preview */}
              {outputSchema && Object.keys(outputSchema).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    عرض الـ schema المُولَّد (للمطورين)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted rounded-lg p-3 overflow-auto max-h-48 text-muted-foreground" dir="ltr">
                    {JSON.stringify(outputSchema, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* System Prompt tab */}
          {activeTab === "prompt" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                يُنصح بإبقائه بسيطاً — البنية كلها تأتي من الـ schema والأمثلة.
              </p>
              <textarea
                {...register("systemPrompt")}
                rows={5}
                dir="rtl"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
              />
              {errors.systemPrompt && <p className="text-xs text-destructive">{errors.systemPrompt.message}</p>}
            </div>
          )}

          {/* Few-shot examples tab */}
          {activeTab === "examples" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                مثالان يُرسلان للنموذج كمرجع للتنسيق المطلوب. تُحفظ في DB ولا تؤثر على الـ schema.
              </p>
              {fewShot.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد أمثلة — سيتم توليدها تلقائياً</p>
              ) : (
                fewShot.map((ex, i) => (
                  <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">مثال {i + 1}</span>
                      <span className="text-xs text-muted-foreground">{ex.type} · {ex.difficulty} · {ex.domain}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{ex.question}</p>
                    <p className="text-xs text-muted-foreground">الإجابة: <span className="text-foreground font-medium">{ex.correctAnswer}</span></p>
                  </div>
                ))
              )}
              <p className="text-xs text-muted-foreground">لتعديل الأمثلة، استخدم API مباشرة أو أضف واجهة تعديل لاحقاً.</p>
            </div>
          )}

          <div className="flex justify-start pt-1">
            <button
              type="submit"
              disabled={saveMutation.isPending || !isDirty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? "جاري الحفظ…" : "حفظ وإعادة بناء الـ Schema"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
