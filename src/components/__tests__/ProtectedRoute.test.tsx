import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import ProtectedRoute from "@/components/ProtectedRoute";

function makeToken(exp: number) {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify({ exp })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${header}.${body}.sig`;
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>Secret dashboard</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

describe("ProtectedRoute", () => {
  afterEach(() => localStorage.clear());

  it("redirects to /login when there are no tokens at all", () => {
    renderProtected();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("renders the protected content when the access token is valid", () => {
    localStorage.setItem("access_token", makeToken(future));
    localStorage.setItem("refresh_token", makeToken(future));
    renderProtected();
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });

  it("still renders when only the access token is stale but the refresh token is valid — the api interceptor silently renews it", () => {
    localStorage.setItem("access_token", makeToken(past));
    localStorage.setItem("refresh_token", makeToken(future));
    renderProtected();
    expect(screen.getByText("Secret dashboard")).toBeInTheDocument();
  });

  it("redirects when both tokens are expired", () => {
    localStorage.setItem("access_token", makeToken(past));
    localStorage.setItem("refresh_token", makeToken(past));
    renderProtected();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("redirects when the refresh token is missing (corrupted storage)", () => {
    localStorage.setItem("access_token", makeToken(future));
    renderProtected();
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });
});
