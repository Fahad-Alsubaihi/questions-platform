"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentConfig } from "@/lib/db/schema";

async function fetchConfigs(): Promise<AgentConfig[]> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()).data;
}

export function useAgentConfig() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["configs"],
    queryFn: fetchConfigs,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<AgentConfig> & { id: string }) => {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
    },
  });

  return {
    configs: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    update: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
