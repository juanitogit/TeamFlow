import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/workspaces";

function getAuthHeader() {
  const token = localStorage.getItem("teamflow_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await fetch(API_BASE, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      return res.json();
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; githubRepoUrl?: string }) => {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useJoinWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: number) => {
      const res = await fetch(`${API_BASE}/${workspaceId}/join`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to join workspace");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
