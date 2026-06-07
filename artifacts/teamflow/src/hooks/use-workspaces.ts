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
    mutationFn: async (inviteCode: string) => {
      const res = await fetch(`${API_BASE}/join`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Código inválido");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useContributions(workspaceId: number | null) {
  return useQuery({
    queryKey: ["contributions", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/contributions/workspace/${workspaceId}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch contributions");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspaceMembers(workspaceId: number | null) {
  return useQuery({
    queryKey: ["workspace_members", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!workspaceId,
  });
}
