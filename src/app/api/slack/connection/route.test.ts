import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), get: vi.fn(), save: vi.fn(), disconnect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/lib/slack-connections", () => ({ getSlackDestination: mocks.get, saveSlackConnection: mocks.save, disconnectSlack: mocks.disconnect, slackOAuthConfigured: () => false }));
import { GET, PUT, DELETE } from "./route";
const input = { webhookUrl: "https://hooks.slack.com/services/TTEST/BTEST/testonly", workspaceName: "Test workspace", channelName: "#test" };
function request(method: string, body: unknown = input, origin = "https://pointed.test") {
  return new Request("https://pointed.test/api/slack/connection", { method, headers: { origin, "Content-Type": "application/json" }, ...(method === "PUT" ? { body: JSON.stringify(body) } : {}) });
}
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "current-user" }); mocks.get.mockResolvedValue(null); });
describe("Slack connection routes", () => {
  it("requires authentication before reading a connection", async () => {
    mocks.user.mockRejectedValue(new Error("UNAUTHORIZED"));
    expect((await GET()).status).toBe(401); expect(mocks.get).not.toHaveBeenCalled();
  });
  it("returns uncached metadata for the signed-in identity", async () => {
    const response = await GET(); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ destination: null, oauthAvailable: false });
    expect(mocks.get).toHaveBeenCalledWith("current-user");
  });
  it("ignores a supplied owner and persists only validated destination fields", async () => {
    expect((await PUT(request("PUT", { ...input, userId: "victim", source: "oauth" }))).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("current-user", { ...input, source: "manual" });
  });
  it("rejects foreign-origin writes and deletes before accessing storage", async () => {
    expect((await PUT(request("PUT", input, "https://foreign.test"))).status).toBe(403);
    expect((await DELETE(request("DELETE", null, "https://foreign.test"))).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it("rejects a non-Slack webhook without exposing it or saving", async () => {
    const response = await PUT(request("PUT", { ...input, webhookUrl: "https://foreign.test/private-secret" }));
    expect(response.status).toBe(400); expect(await response.text()).not.toContain("private-secret");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("disconnects only the current identity", async () => {
    expect((await DELETE(request("DELETE"))).status).toBe(200);
    expect(mocks.disconnect).toHaveBeenCalledWith("current-user");
  });
});
