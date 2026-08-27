import { useSyncExternalStore } from "react";

import { getCurrentUserClaims, type CurrentUserClaims } from "@/lib/jwt";

// localStorage doesn't emit events in the tab that wrote it, so login/logout
// call this directly to make useCurrentUser() re-render immediately instead
// of waiting for a route change to happen to re-read the token.
const listeners = new Set<() => void>();

export function notifyAuthChanged() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// useSyncExternalStore requires getSnapshot to return a referentially stable
// value when nothing changed — recomputing a fresh object every call causes
// React to treat every render as "changed" and loop forever. Cache the
// decoded claims and only recompute when the raw token actually changes.
let cachedToken: string | null | undefined;
let cachedClaims: CurrentUserClaims;

function getSnapshot(): CurrentUserClaims {
  const token = localStorage.getItem("access_token");
  if (token !== cachedToken) {
    cachedToken = token;
    cachedClaims = getCurrentUserClaims();
  }
  return cachedClaims;
}

export function useCurrentUser() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
