import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { isTokenExpired } from "@/lib/jwt";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!accessToken || !refreshToken) {
    return <Navigate to="/login" replace />;
  }

  // Access token may be stale — that's fine, the API interceptor silently
  // refreshes it on the first 401. Only bounce to login when both tokens
  // are unusable (e.g. corrupted storage or an expired refresh token).
  if (isTokenExpired(accessToken) && isTokenExpired(refreshToken)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
