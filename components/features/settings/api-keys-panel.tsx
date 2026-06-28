"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, EyeOff, Trash2, CheckCircle, XCircle, Loader2, Zap, Plus, ChevronDown, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaskedKey {
  id: string;
  provider: "gemini" | "groq" | "anthropic";
  label: string;
  model: string;
  maskedKey: string;
  isActive: boolean;
  updatedAt: string;
}

interface ModelOption {
  id: string;
  name: string;
}

const TAVILY = {
  name: "Tavily Search",
  description: "محرك بحث الـ AI — يُستخدم لجلب المحتوى من الإنترنت",
  placeholder: "tvly-...",
  docsUrl: "https://app.tavily.com/home",
  color: "text-violet-400",
  bg: "bg-violet-500/10 border-violet-500/30",
};

async function fetchModelsById(id: string): Promise<ModelOption[]> {
  const res = await fetch(`/api/keys/models?id=${id}`);
  if (!res.ok) throw new Error((await res.json()).error);
  return (await res.json()).data;
}

async function fetchModelsByKey(provider: string, key: string): Promise<ModelOption[]> {
  const res = await fetch("/api/keys/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, key }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return (await res.json()).data;
}

const PROVIDERS = [
  {
    id: "gemini" as const,
    name: "Google Gemini",
    description: "دعم عربي ممتاز",
    badge: "Google",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    activeBg: "bg-blue-500/20 border-blue-500",
    placeholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "groq" as const,
    name: "Groq",
    description: "مجاني • سريع جداً",
    badge: "Groq",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
    activeBg: "bg-orange-500/20 border-orange-500",
    placeholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  {
    id: "anthropic" as const,
    name: "Claude (Anthropic)",
    description: "الأدق في اللغة العربية",
    badge: "Anthropic",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    activeBg: "bg-amber-500/20 border-amber-500",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
];

async function fetchKeys(): Promise<MaskedKey[]> {
  const res = await fetch("/api/keys");
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()).data;
}

export function ApiKeysPanel() {
  const queryClient = useQueryClient();
  const { data: keys = [], isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchKeys,
  });

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [manualModelInputs, setManualModelInputs] = useState<Record<string, string>>({});
  const [manualMode, setManualMode] = useState<Record<string, boolean>>({});
  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>({});
  const [modelsLoading, setModelsLoading] = useState<Record<string, boolean>>({});
  const [modelsError, setModelsError] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<string, "idle" | "ok" | "error">>({});
  const [testMsg, setTestMsg] = useState<Record<string, string>>({});
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function loadModelsByKey(provider: "gemini" | "groq" | "anthropic", key: string) {
    if (key.length < 10) return;
    clearTimeout(debounceRef.current[provider]);
    debounceRef.current[provider] = setTimeout(async () => {
      setModelsLoading((p) => ({ ...p, [provider]: true }));
      setModelsError((p) => ({ ...p, [provider]: "" }));
      try {
        const models = await fetchModelsByKey(provider, key);
        setDynamicModels((p) => ({ ...p, [provider]: models }));
        if (models.length > 0 && !selectedModels[provider]) {
          setSelectedModels((p) => ({ ...p, [provider]: models[0].id }));
        }
      } catch (err) {
        setModelsError((p) => ({ ...p, [provider]: (err as Error).message }));
        setDynamicModels((p) => ({ ...p, [provider]: [] }));
      } finally {
        setModelsLoading((p) => ({ ...p, [provider]: false }));
      }
    }, 800);
  }

  async function loadModelsById(id: string, provider: "gemini" | "groq" | "anthropic") {
    setModelsLoading((p) => ({ ...p, [provider]: true }));
    setModelsError((p) => ({ ...p, [provider]: "" }));
    try {
      const models = await fetchModelsById(id);
      setDynamicModels((p) => ({ ...p, [provider]: models }));
    } catch (err) {
      setModelsError((p) => ({ ...p, [provider]: (err as Error).message }));
    } finally {
      setModelsLoading((p) => ({ ...p, [provider]: false }));
    }
  }

  useEffect(() => {
    keys.forEach((k) => {
      if (k.provider === "gemini" || k.provider === "groq") {
        if (!dynamicModels[k.provider]) {
          loadModelsById(k.id, k.provider);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  const saveMutation = useMutation({
    mutationFn: async ({ provider, key, model }: { provider: string; key: string; model: string }) => {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key, label: provider, model }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (_, { provider }) => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setInputs((p) => ({ ...p, [provider]: "" }));
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, model }: { id: string; model?: string }) => {
      const res = await fetch("/api/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, model }),
      });
      if (!res.ok) throw new Error("Failed to activate");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const updateModelMutation = useMutation({
    mutationFn: async ({ id, model }: { id: string; model: string }) => {
      const res = await fetch("/api/keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, model }),
      });
      if (!res.ok) throw new Error("Failed to update model");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  async function testKey(provider: "gemini" | "groq" | "anthropic", key: string) {
    setTestResult((p) => ({ ...p, [provider]: "idle" }));
    setTestMsg((p) => ({ ...p, [provider]: "جاري الاختبار..." }));
    try {
      const res = await fetch("/api/keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const json = await res.json();
      if (res.ok && json.data?.ok) {
        setTestResult((p) => ({ ...p, [provider]: "ok" }));
        setTestMsg((p) => ({ ...p, [provider]: "✓ الـ Key يعمل!" }));
      } else {
        setTestResult((p) => ({ ...p, [provider]: "error" }));
        setTestMsg((p) => ({ ...p, [provider]: json.error ?? "فشل الاختبار" }));
      }
    } catch {
      setTestResult((p) => ({ ...p, [provider]: "error" }));
      setTestMsg((p) => ({ ...p, [provider]: "خطأ في الاتصال" }));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  const keyMap = Object.fromEntries(keys.map((k) => [k.provider, k]));
  const tavilyKey = keyMap["tavily"];
  const tavilyInput = inputs["tavily"] ?? "";

  return (
    <div className="space-y-4">
      {/* Tavily Search Key */}
      <div className={cn("rounded-lg border p-5 space-y-4", TAVILY.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("text-2xl font-bold", TAVILY.color)}>🔍</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{TAVILY.name}</h3>
                {tavilyKey && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success dark:bg-success/10 dark:text-success border border-success/40 dark:border-success/30 font-medium">
                    مفعّل
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{TAVILY.description}</p>
            </div>
          </div>
          {tavilyKey && (
            <button
              onClick={() => deleteMutation.mutate(tavilyKey.id)}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="حذف"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {tavilyKey && (
          <div className="flex items-center gap-2 rounded-md bg-background/50 border border-border px-3 py-2">
            <span className="font-mono text-sm text-foreground flex-1">{tavilyKey.maskedKey}</span>
            <span className="text-xs text-muted-foreground">محفوظ ومشفّر</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            {tavilyKey ? "تغيير الـ Key" : "أضف الـ Key"}
            {" — "}
            <a href={TAVILY.docsUrl} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", TAVILY.color)}>
              احصل على key مجاني ↗
            </a>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey["tavily"] ? "text" : "password"}
                value={tavilyInput}
                onChange={(e) => setInputs((p) => ({ ...p, tavily: e.target.value }))}
                placeholder={TAVILY.placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowKey((p) => ({ ...p, tavily: !p["tavily"] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey["tavily"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => saveMutation.mutate({ provider: "tavily", key: tavilyInput, model: "" })}
              disabled={!tavilyInput || saveMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-md font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saveMutation.isPending && saveMutation.variables?.provider === "tavily" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              حفظ
            </button>
          </div>
        </div>
      </div>

      {PROVIDERS.map((p) => {
        const saved = keyMap[p.id] as MaskedKey | undefined;
        const inputVal = inputs[p.id] ?? "";
        const isActive = saved?.isActive ?? false;
        const tResult = testResult[p.id];
        const fetchedModels = dynamicModels[p.id] ?? [];
        const isLoadingModels = modelsLoading[p.id] ?? false;
        const modelsFetchError = modelsError[p.id] ?? "";
        const currentModel = saved?.model || "";
        const selectedModel = selectedModels[p.id] ?? "";
        const currentModelName = fetchedModels.find((m) => m.id === currentModel)?.name ?? currentModel;
        const isManual = manualMode[p.id] ?? false;
        const manualVal = manualModelInputs[p.id] ?? currentModel;

        return (
          <div
            key={p.id}
            className={cn(
              "rounded-lg border p-5 space-y-4 transition-all",
              isActive ? p.activeBg : p.bg
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("text-2xl font-bold", p.color)}>
                  {p.badge === "Google" ? "G" : "⚡"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    {isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success-bg text-success dark:bg-success/10 dark:text-success border border-success/40 dark:border-success/30 font-medium">
                        نشط
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {p.description}
                    {saved && (
                      <> — <span className={cn("font-mono font-medium", p.color)}>{currentModelName}</span></>
                    )}
                  </p>
                </div>
              </div>
              {saved && (
                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => activateMutation.mutate({ id: saved.id })}
                      disabled={activateMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-success-bg border border-success/40 text-success hover:bg-success/10 dark:bg-success/10 dark:border-success/30 dark:text-success dark:hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      <Zap className="h-3 w-3" />
                      تفعيل
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(saved.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Current model selector (when key is saved) */}
            {saved && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">المودل المستخدم</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setManualMode((prev) => ({ ...prev, [p.id]: !isManual }))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      {isManual ? "اختر من القائمة" : "اكتب يدوياً"}
                    </button>
                    {!isManual && (
                      <button
                        onClick={() => {
                          const key = inputs[p.id];
                          if (key) loadModelsByKey(p.id, key);
                          else if (saved) loadModelsById(saved.id, p.id);
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" />
                        تحديث
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {isManual ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualVal}
                          onChange={(e) => setManualModelInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          placeholder="مثال: gemini-2.0-flash"
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={() => {
                            if (manualVal.trim()) {
                              updateModelMutation.mutate({ id: saved.id, model: manualVal.trim() });
                            }
                          }}
                          disabled={!manualVal.trim() || updateModelMutation.isPending}
                          className="px-3 py-2 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {updateModelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "حفظ"}
                        </button>
                      </div>
                    ) : isLoadingModels ? (
                      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري جلب المودلات...
                      </div>
                    ) : fetchedModels.length > 0 ? (
                      <>
                        <select
                          value={currentModel}
                          onChange={(e) => updateModelMutation.mutate({ id: saved.id, model: e.target.value })}
                          className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {fetchedModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </>
                    ) : (
                      <div className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                        {currentModelName || currentModel || "—"}
                        {modelsFetchError && <span className="text-xs text-destructive mr-2">({modelsFetchError})</span>}
                      </div>
                    )}
                  </div>
                  {!isManual && updateModelMutation.isPending && (
                    <div className="flex items-center px-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Saved key display */}
            {saved && (
              <div className="flex items-center gap-2 rounded-md bg-background/50 border border-border px-3 py-2">
                <span className="font-mono text-sm text-foreground flex-1">{saved.maskedKey}</span>
                <span className="text-xs text-muted-foreground">محفوظ ومشفّر</span>
              </div>
            )}

            {/* Input new key */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                {saved ? "تغيير الـ Key" : "أضف الـ Key"}
                {" — "}
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("hover:underline", p.color)}
                >
                  احصل على key ↗
                </a>
              </label>

              {/* Model selector for new key — populated dynamically or manual */}
              {!saved && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">
                      المودل
                      {isLoadingModels && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
                    </label>
                    <button
                      onClick={() => setManualMode((prev) => ({ ...prev, [p.id]: !isManual }))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      {isManual ? "اختر من القائمة" : "اكتب يدوياً"}
                    </button>
                  </div>
                  {isManual ? (
                    <input
                      type="text"
                      value={manualModelInputs[p.id] ?? ""}
                      onChange={(e) => {
                        setManualModelInputs((prev) => ({ ...prev, [p.id]: e.target.value }));
                        setSelectedModels((prev) => ({ ...prev, [p.id]: e.target.value }));
                      }}
                      placeholder="مثال: gemini-2.0-flash"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : fetchedModels.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModels((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {fetchedModels.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                      {isLoadingModels ? "جاري جلب المودلات..." : "أدخل الـ key لجلب المودلات — أو اكتب يدوياً"}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey[p.id] ? "text" : "password"}
                    value={inputVal}
                    onChange={(e) => {
                      setInputs((prev) => ({ ...prev, [p.id]: e.target.value }));
                      loadModelsByKey(p.id, e.target.value);
                    }}
                    placeholder={p.placeholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowKey((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey[p.id] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Test button */}
                <button
                  onClick={() => testKey(p.id, inputVal)}
                  disabled={!inputVal || tResult === "idle"}
                  className="px-3 py-2 text-xs rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
                  title="اختبر الـ key"
                >
                  {tResult === "idle" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "اختبر"
                  )}
                </button>

                {/* Save button */}
                <button
                  onClick={() =>
                    saveMutation.mutate({ provider: p.id, key: inputVal, model: selectedModel })
                  }
                  disabled={!inputVal || saveMutation.isPending}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs rounded-md font-medium transition-colors disabled:opacity-50",
                    "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {saveMutation.isPending && saveMutation.variables?.provider === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  حفظ
                </button>
              </div>

              {/* Test result */}
              {testMsg[p.id] && (
                <div
                  className={cn(
                    "flex items-center gap-2 text-xs px-3 py-2 rounded-md border",
                    tResult === "ok"
                      ? "bg-success-bg border-success/40 text-success dark:bg-success/10 dark:border-success/30 dark:text-success"
                      : tResult === "error"
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                  {tResult === "ok" ? (
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  ) : tResult === "error" ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  )}
                  <span className="line-clamp-2">{testMsg[p.id]}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
