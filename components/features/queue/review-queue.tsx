"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuestionCard } from "./question-card";
import type { Question } from "@/lib/db/schema";

async function fetchPendingQuestions(): Promise<Question[]> {
  const res = await fetch("/api/questions?status=pending");
  if (!res.ok) throw new Error("فشل تحميل الأسئلة");
  const json = await res.json();
  return json.data;
}

export function ReviewQueue() {
  const queryClient = useQueryClient();

  const { data: questions, isLoading, isError } = useQuery({
    queryKey: ["questions", "pending"],
    queryFn: fetchPendingQuestions,
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      data,
    }: {
      id: string;
      action: "approve" | "reject" | "edit";
      data?: Partial<Question>;
    }) => {
      const res = await fetch(`/api/questions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "فشل تنفيذ الإجراء");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive font-medium">فشل تحميل الطابور</p>
        <p className="text-sm text-muted-foreground mt-1">تحقق من اتصالك وأعد المحاولة</p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-lg font-medium text-foreground">الطابور فارغ</p>
        <p className="text-sm text-muted-foreground mt-1">
          قم بتوليد أسئلة جديدة لتبدأ المراجعة
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {questions.length} سؤال{questions.length !== 1 ? "" : ""} في انتظار المراجعة
      </p>
      <div className="grid gap-4">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onApprove={() =>
              actionMutation.mutate({ id: question.id, action: "approve" })
            }
            onReject={() =>
              actionMutation.mutate({ id: question.id, action: "reject" })
            }
            onEdit={(data) =>
              actionMutation.mutate({ id: question.id, action: "edit", data })
            }
            isPending={actionMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}
