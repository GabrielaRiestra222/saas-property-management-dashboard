import { useCallback } from "react";

import api from "@/lib/api";
import type { AuthTokens } from "@/types";

export function useAuth() {
  const login = useCallback(async (username: string, password: string) => {
    const { data } = await api.post<AuthTokens>("/token/", { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }, []);

  const isAuthenticated = useCallback(() => {
    return Boolean(localStorage.getItem("access_token"));
  }, []);

  return {
    login,
    logout,
    isAuthenticated,
  };
}
