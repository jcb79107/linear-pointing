import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), save: vi.fn(), configured: vi.fn(), jar: { get: vi.fn(), delete: vi.fn() } }));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ APP_URL: "https://pointed.test" }) }));
vi.mock("@/lib/slack-connections", () => ({ saveSlackConnection: mocks.save, slackOAuthConfigured: mocks.configured }));
import { GET } from "./route";
const payload = { ok: true, team: { id: "T123", name: "Test workspace" }, incoming_webhook: { url: "https://hooks.slack.com/services/T123/B123/secret", channel: "#planning", channel_id: "C123" } };
function callback(query = "state=valid&code=test") { return GET(new Request(`https://pointed.test/api/auth/slack/callback?${query}`)); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "user-a" }); mocks.configured.mockReturnValue(true);
  mocks.jar.get.mockImplementation((key) => ({ value: key === "slack_oauth_state" ? "valid" : "user-a" }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
  vi.stubEnv("SLACK_CLIENT_ID", "client"); vi.stubEnv("SLACK_CLIENT_SECRET", "secret");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Slack OAuth callback", () => {
  it("saves only a validated webhook bound to the initiating Linear identity", async () => {
    const response = await callback();
    expect(response.headers.get("location")).toContain("slack=connected");
    expect(mocks.save).toHaveBeenCalledWith("user-a", { webhookUrl: payload.incoming_webhook.url, workspaceName: "Test workspace", channelName: "#planning", source: "oauth" });
    expect(mocks.jar.delete).toHaveBeenCalledWith("slack_oauth_state");
    expect(mocks.jar.delete).toHaveBeenCalledWith("slack_oauth_user");
  });
  it.each(["state=wrong&code=test", "code=test"])("rejects missing/mismatched state", async (query) => {
    expect((await callback(query)).headers.get("location")).toContain("slack=expired");
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects account/workspace switches during OAuth", async () => {
    mocks.user.mockResolvedValue({ id: "user-b" });
    expect((await callback()).headers.get("location")).toContain("slack=expired");
    expect(fetch).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects signed-out callbacks", async () => {
    mocks.user.mockResolvedValue(null); await callback(); expect(mocks.save).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it("handles denial without removing the existing connection", async () => {
    expect((await callback("state=valid&error=access_denied")).headers.get("location")).toContain("slack=cancelled");
    expect(mocks.save).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{ ok: false, error: "bad_code" }, { ...payload, incoming_webhook: { ...payload.incoming_webhook, url: "https://evil.test" } }])("rejects invalid Slack responses", async (body) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(body));
    expect((await callback()).headers.get("location")).toContain("slack=failed"); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("contains network errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("secret"));
    const response = await callback(); expect(response.headers.get("location")).toContain("slack=failed"); expect(mocks.save).not.toHaveBeenCalled();
  });
});
