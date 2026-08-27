import { toast } from "sonner";

import { ensureFreshAccessToken } from "@/lib/api";
import { isTokenExpired } from "@/lib/jwt";

const CHECK_INTERVAL_MS = 30_000;
// Start refreshing this long before the access token actually expires, so a
// request mid-task never has to stall on a synchronous refresh.
const REFRESH_MARGIN_SECONDS = 90;

let intervalId: ReturnType<typeof setInterval> | null = null;
let warnedExpired = false;

async function tick() {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!accessToken || !refreshToken) {
    return;
  }

  if (isTokenExpired(refreshToken)) {
    if (!warnedExpired) {
      warnedExpired = true;
      toast.warning("Tu sesión ha caducado. Inicia sesión de nuevo.");
      window.setTimeout(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 1500);
    }
    return;
  }

  if (isTokenExpired(accessToken, REFRESH_MARGIN_SECONDS)) {
    // Silent — this is the common case (access tokens are short-lived) and
    // shouldn't interrupt anyone with a toast just for routine housekeeping.
    await ensureFreshAccessToken();
  }
}

/** Call once from the authenticated shell (Layout) to keep the session alive. */
export function startSessionWatcher() {
  if (intervalId) {
    return;
  }

  warnedExpired = false;
  void tick();
  intervalId = setInterval(() => void tick(), CHECK_INTERVAL_MS);
}

export function stopSessionWatcher() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
