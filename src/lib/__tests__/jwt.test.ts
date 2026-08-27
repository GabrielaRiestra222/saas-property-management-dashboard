import { afterEach, describe, expect, it } from "vitest";

import { decodeJwt, getCurrentUserClaims, isTokenExpired } from "@/lib/jwt";

function makeToken(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${header}.${body}.signature`;
}

describe("decodeJwt", () => {
  it("decodes a well-formed token payload", () => {
    const token = makeToken({ exp: 12345, role: "OWNER" });
    expect(decodeJwt(token)).toMatchObject({ exp: 12345, role: "OWNER" });
  });

  it("returns null for garbage input", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("")).toBeNull();
  });
});

describe("isTokenExpired", () => {
  it("treats a token with a future exp as valid", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(token)).toBe(false);
  });

  it("treats a token with a past exp as expired", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 10 });
    expect(isTokenExpired(token)).toBe(true);
  });

  it("applies the skew margin ahead of the real expiry", () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 60 });
    expect(isTokenExpired(token, 10)).toBe(false);
    expect(isTokenExpired(token, 90)).toBe(true);
  });

  it("treats an undecodable token as expired (fail closed)", () => {
    expect(isTokenExpired("garbage")).toBe(true);
  });
});

describe("getCurrentUserClaims", () => {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;

  afterEach(() => localStorage.clear());

  it("returns empty claims when there is no token", () => {
    expect(getCurrentUserClaims()).toMatchObject({ role: null, isOwner: false, isAdmin: false });
  });

  it("derives isOwner for an OWNER-role user", () => {
    localStorage.setItem("access_token", makeToken({ exp: futureExp, role: "OWNER", is_superuser: false }));
    const claims = getCurrentUserClaims();
    expect(claims.isOwner).toBe(true);
    expect(claims.isAdmin).toBe(false);
  });

  it("derives isAdmin for an ADMIN-role user", () => {
    localStorage.setItem("access_token", makeToken({ exp: futureExp, role: "ADMIN", is_superuser: false }));
    const claims = getCurrentUserClaims();
    expect(claims.isAdmin).toBe(true);
    expect(claims.isOwner).toBe(false);
  });

  it("a superuser is never treated as an owner, even with role=OWNER", () => {
    localStorage.setItem("access_token", makeToken({ exp: futureExp, role: "OWNER", is_superuser: true }));
    const claims = getCurrentUserClaims();
    expect(claims.isSuperuser).toBe(true);
    expect(claims.isOwner).toBe(false);
    expect(claims.isAdmin).toBe(true);
  });
});
