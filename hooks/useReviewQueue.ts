"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Question } from "@/lib/db/schema";

async function fetchPending(): Promise<Question[]> {
  const res = await fetch("/api/questions?status=pending");
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()).data;
}

async function performAction(
  id: string,
  action: "approve" | "reject" | "edit",
  data?: Partial<Question>
) {
  const res = await fetch(`/api/questions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  if (!res.ok) throw new Error("Action failed");
  return res.json();
}

export function useReviewQueue() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["questions", "pending"],
    queryFn: fetchPending,
  });

  const mutation = useMutation({
    mutationFn: ({
      id,
      action,
      data,
    }: {
      id: string;
      action: "approve" | "reject" | "edit";
      data?: Partial<Question>;
    }) => performAction(id, action, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });

  return {
    questions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    approve: (id: string) => mutation.mutate({ id, action: "approve" }),
    reject: (id: string) => mutation.mutate({ id, action: "reject" }),
    edit: (id: string, data: Partial<Question>) =>
      mutation.mutate({ id, action: "edit", data }),
    isPending: mutation.isPending,
  };
}
