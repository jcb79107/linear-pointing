import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), configured: vi.fn(), set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.set }) }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ APP_URL: "https://pointed.test" }) }));
vi.mock("@/lib/crypto", () => ({ randomToken: () => "test-random-state" }));
vi.mock("@/lib/slack-connections", () => ({ slackOAuthConfigured: mocks.configured }));
import { GET } from "./route";
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "current-user" }); mocks.configured.mockReturnValue(true); vi.stubEnv("SLACK_CLIENT_ID", "test-client"); });
afterEach(() => vi.unstubAllEnvs());
it("sends signed-out users to sign in without creating authorization cookies", async () => {
  mocks.user.mockResolvedValue(null); expect((await GET()).headers.get("location")).toBe("https://pointed.test/app"); expect(mocks.set).not.toHaveBeenCalled();
});
it("provides the webhook fallback when OAuth is not configured", async () => {
  mocks.configured.mockReturnValue(false); expect((await GET()).headers.get("location")).toContain("slack=unavailable#slack"); expect(mocks.set).not.toHaveBeenCalled();
});
it("requests only channel-bound webhook permission and binds state to the current identity", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const url = new URL((await GET()).headers.get("location")!);
  expect(url.origin).toBe("https://slack.com"); expect(url.searchParams.get("scope")).toBe("incoming-webhook");
  expect(url.searchParams.get("redirect_uri")).toBe("https://pointed.test/api/auth/slack/callback");
  expect(url.searchParams.get("state")).toBe("test-random-state"); expect(url.searchParams.has("team")).toBe(false);
  const options = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 };
  expect(mocks.set).toHaveBeenCalledWith("slack_oauth_state", "test-random-state", options);
  expect(mocks.set).toHaveBeenCalledWith("slack_oauth_user", "current-user", options);
});
