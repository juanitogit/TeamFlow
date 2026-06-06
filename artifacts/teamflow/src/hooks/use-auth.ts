import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useAuth() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const token = localStorage.getItem("teamflow_token");

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      staleTime: Infinity,
      queryKey: getGetMeQueryKey(),
    },
    request: {
      headers: {
        Authorization: `Bearer ${token || ""}`,
      },
    },
  });

  const isAuthenticated = !!user;

  const setToken = (token: string) => {
    localStorage.setItem("teamflow_token", token);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = () => {
    localStorage.removeItem("teamflow_token");
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    setToken,
    logout,
  };
}
