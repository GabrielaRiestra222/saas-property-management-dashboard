import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ensureFreshAccessToken } from "@/lib/api";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify({ exp })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${header}.${body}.sig`;
}

describe("ensureFreshAccessToken", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => localStorage.clear());

  it("does nothing and returns null when there is no refresh token stored", async () => {
    const postSpy = vi.spyOn(axios, "post");
    const result = await ensureFreshAccessToken();
    expect(result).toBeNull();
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("exchanges the refresh token for a new access token and persists both", async () => {
    localStorage.setItem("refresh_token", "some-refresh-token");
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { access: "new-access-token", refresh: "rotated-refresh-token" },
    });

    const result = await ensureFreshAccessToken();

    expect(result).toBe("new-access-token");
    expect(localStorage.getItem("access_token")).toBe("new-access-token");
    // SIMPLE_JWT has ROTATE_REFRESH_TOKENS on — a rotated refresh must be saved too.
    expect(localStorage.getItem("refresh_token")).toBe("rotated-refresh-token");
  });

  it("keeps the existing refresh token when the backend doesn't rotate it", async () => {
    localStorage.setItem("refresh_token", "stable-refresh-token");
    vi.spyOn(axios, "post").mockResolvedValue({ data: { access: "new-access-token" } });

    await ensureFreshAccessToken();

    expect(localStorage.getItem("refresh_token")).toBe("stable-refresh-token");
  });

  it("resolves to null and leaves storage untouched when the refresh call fails", async () => {
    localStorage.setItem("refresh_token", "dead-refresh-token");
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh token expired"));

    const result = await ensureFreshAccessToken();

    expect(result).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBe("dead-refresh-token");
  });

  it("dedupes concurrent calls into a single network request", async () => {
    localStorage.setItem("refresh_token", "some-refresh-token");
    const postSpy = vi.spyOn(axios, "post").mockResolvedValue({
      data: { access: makeToken(Math.floor(Date.now() / 1000) + 3600) },
    });

    const [a, b, c] = await Promise.all([
      ensureFreshAccessToken(),
      ensureFreshAccessToken(),
      ensureFreshAccessToken(),
    ]);

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
