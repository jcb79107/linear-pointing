import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: { get: vi.fn(), delete: vi.fn() },
  getServerEnv: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.cookies }));
vi.mock("@/lib/env", () => ({ getServerEnv: mocks.getServerEnv }));
vi.mock("@/lib/auth", () => ({ createUserSession: vi.fn() }));
vi.mock("@/db", () => ({ db: {} }));
import { GET } from "./route";

function callback(query: string) {
  return GET(new Request(`https://pointed.test/api/auth/linear/callback?${query}`));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerEnv.mockReturnValue({ APP_URL: "https://pointed.test", LINEAR_CLIENT_ID: "fixture", LINEAR_REDIRECT_URI: "https://pointed.test/api/auth/linear/callback" });
  mocks.cookies.get.mockImplementation((name: string) => ({
    linear_oauth_state: { value: "valid" },
    linear_oauth_verifier: { value: "verifier" },
    linear_oauth_return: { value: "/s/INVITE123" },
  })[name]);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe("Linear OAuth recovery", () => {
  it("returns a denied guest to their invitation with retry guidance", async () => {
    const response = await callback("state=valid&error=access_denied");
    expect(response.headers.get("location")).toBe("https://pointed.test/s/INVITE123?authError=token_exchange_failed");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an expired guest flow to the same invitation with a fresh-start message", async () => {
    const response = await callback("state=wrong&error=access_denied");
    expect(response.headers.get("location")).toBe("https://pointed.test/s/INVITE123?authError=invalid_oauth_state");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps failure redirects on the app origin and rejects tampered external return paths", async () => {
    mocks.cookies.get.mockImplementation((name: string) => ({
      linear_oauth_state: { value: "valid" },
      linear_oauth_verifier: { value: "verifier" },
      linear_oauth_return: { value: "//elsewhere.example" },
    })[name]);
    const response = await callback("state=valid&error=access_denied");
    expect(response.headers.get("location")).toBe("https://pointed.test/app?authError=token_exchange_failed");
    expect(fetch).not.toHaveBeenCalled();
  });
});
