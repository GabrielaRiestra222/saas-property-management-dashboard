import axios from "axios";

import { notifyAuthChanged } from "@/lib/hooks/useCurrentUser";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL,
});

const apiOrigin = baseURL.replace(/\/api\/?$/, "");

export function resolveMediaUrl(value?: string | null) {
  if (!value) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(value)) {
    return value;
  }

  return new URL(value, apiOrigin || window.location.origin).toString();
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

function clearSessionAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  notifyAuthChanged();

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

let refreshPromise: Promise<string | null> | null = null;

/** Refreshes the access token if a refresh token is present. Safe to call
 *  concurrently — every caller shares the same in-flight request. */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access: string; refresh?: string }>(`${baseURL}/token/refresh/`, { refresh: refreshToken })
      .then(({ data }) => {
        localStorage.setItem("access_token", data.access);
        if (data.refresh) {
          localStorage.setItem("refresh_token", data.refresh);
        }
        notifyAuthChanged();
        return data.access;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const requestUrl = error.config?.url ?? "";
    const isAuthRequest = requestUrl.includes("/token/");

    if (error.response?.status === 401 && !isAuthRequest && !error.config?._retry) {
      const newAccessToken = await ensureFreshAccessToken();

      if (newAccessToken) {
        error.config._retry = true;
        error.config.headers = {
          ...error.config.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return api.request(error.config);
      }

      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  },
);

export const publicApi = axios.create({
  baseURL,
});

export default api;
