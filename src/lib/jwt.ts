type JwtPayload = {
  exp?: number;
  role?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
  user_id?: number;
  full_name?: string;
  [key: string]: unknown;
};

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 10): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 - skewSeconds * 1000 <= Date.now();
}

export type CurrentUserClaims = {
  role: string | null;
  isSuperuser: boolean;
  isStaff: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  fullName: string | null;
};

const EMPTY_CLAIMS: CurrentUserClaims = {
  role: null,
  isSuperuser: false,
  isStaff: false,
  isOwner: false,
  isAdmin: false,
  fullName: null,
};

/** Reads role/permission claims embedded in the access token by the backend. */
export function getCurrentUserClaims(): CurrentUserClaims {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return EMPTY_CLAIMS;
  }

  const payload = decodeJwt(token);
  if (!payload) {
    return EMPTY_CLAIMS;
  }

  const isSuperuser = Boolean(payload.is_superuser);
  const role = typeof payload.role === "string" ? payload.role : null;

  return {
    role,
    isSuperuser,
    isStaff: Boolean(payload.is_staff),
    isOwner: !isSuperuser && role === "OWNER",
    isAdmin: isSuperuser || role === "ADMIN",
    fullName: typeof payload.full_name === "string" ? payload.full_name : null,
  };
}
