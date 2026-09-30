import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), details: vi.fn(), deliver: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ APP_URL: "https://pointed.test" }) }));
vi.mock("@/lib/sessions", () => ({ getSessionInviteDetails: mocks.details, recordSlackInviteOutcome: mocks.audit }));
vi.mock("@/lib/slack-connections", () => ({ deliverSlackInvite: mocks.deliver }));
import { POST } from "./route";
const connectionId = "61f24d04-c30b-4157-9a4d-31fc967c9862";
const request = (origin = "https://pointed.test") => new Request("https://pointed.test/api/sessions/session/slack-invite", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ connectionId, userId: "attacker", webhookUrl: "https://evil.test", title: "spoofed" }) });
const params = { params: Promise.resolve({ id: "session" }) };
beforeEach(() => {
  vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "user-a" });
  mocks.details.mockResolvedValue({ title: "Real session", teamName: "Real team", issueCount: 3, code: "ROOM" });
  mocks.deliver.mockResolvedValue(undefined); mocks.audit.mockResolvedValue(undefined);
});
describe("send invite authorization", () => {
  it("uses the authenticated sender and server-owned session content", async () => {
    expect((await POST(request(), params)).status).toBe(200);
    expect(mocks.details).toHaveBeenCalledWith("session", "user-a");
    expect(mocks.deliver).toHaveBeenCalledWith("user-a", connectionId, expect.objectContaining({ title: "Real session", inviteUrl: "https://pointed.test/s/ROOM" }));
  });
  it("rejects cross-origin sends", async () => {
    expect((await POST(request("https://evil.test"), params)).status).toBe(403); expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("rejects unauthorized users", async () => {
    mocks.user.mockRejectedValue(new Error("UNAUTHORIZED"));
    expect((await POST(request(), params)).status).toBe(401); expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("does not send when the facilitator membership guard denies access", async () => {
    mocks.details.mockRejectedValue(new Error("FORBIDDEN"));
    expect((await POST(request(), params)).status).toBe(403); expect(mocks.deliver).not.toHaveBeenCalled();
  });
  it("does not report a delivered message as failed when audit storage fails", async () => {
    mocks.audit.mockRejectedValue(new Error("database unavailable"));
    expect((await POST(request(), params)).status).toBe(200); expect(mocks.deliver).toHaveBeenCalledTimes(1);
  });
});
