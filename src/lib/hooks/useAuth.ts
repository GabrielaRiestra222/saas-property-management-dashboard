import { useCallback } from "react";

import api from "@/lib/api";
import type { AuthTokens } from "@/types";

import { notifyAuthChanged } from "./useCurrentUser";

export function useAuth() {
  const login = useCallback(async (username: string, password: string) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    const { data } = await api.post<AuthTokens>("/token/", {
      username: username.trim(),
      password: password.trim(),
    });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    notifyAuthChanged();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    notifyAuthChanged();
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
