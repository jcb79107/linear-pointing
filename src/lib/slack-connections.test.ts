import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ where: vi.fn(), returning: vi.fn(), values: vi.fn(), conflict: vi.fn(), select: vi.fn(), encrypt: vi.fn(), decrypt: vi.fn(), send: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {
  update: () => ({ set: () => ({ where: mocks.where }) }),
  select: mocks.select,
  insert: () => ({ values: mocks.values }),
} }));
vi.mock("@/lib/crypto", () => ({ encryptSecret: mocks.encrypt, decryptSecret: mocks.decrypt }));
vi.mock("@/lib/slack", async (original) => ({ ...await original<typeof import("@/lib/slack")>(), sendSlackWebhook: mocks.send }));
import { deliverSlackInvite, getSlackDestination, saveSlackConnection } from "./slack-connections";
const invite = { title: "Session", teamName: "Team", issueCount: 1, inviteUrl: "https://pointed.test/s/ROOM" };
beforeEach(() => {
  vi.clearAllMocks(); mocks.where.mockReturnValue({ returning: mocks.returning });
  mocks.values.mockReturnValue({ onConflictDoUpdate: mocks.conflict }); mocks.conflict.mockResolvedValue(undefined);
  mocks.decrypt.mockReturnValue("https://hooks.slack.com/services/T/B/secret"); mocks.encrypt.mockReturnValue("encrypted-only"); mocks.send.mockResolvedValue(undefined);
});
describe("private Slack destinations", () => {
  it("claims sends atomically for the authenticated user and confirmed connection only", async () => {
    mocks.returning.mockResolvedValue([{ encryptedWebhookUrl: "encrypted-only" }]);
    await deliverSlackInvite("sender-user", "confirmed-connection", invite);
    const query = new PgDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(query.params).toContain("sender-user"); expect(query.params).toContain("confirmed-connection");
    expect(query.sql).toContain('"user_id"'); expect(query.sql).toContain('"connection_id"'); expect(query.sql).toContain('"last_sent_at"');
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("does not decrypt or send when another account, stale destination, or cooldown prevents the claim", async () => {
    mocks.returning.mockResolvedValue([]);
    await expect(deliverSlackInvite("sender-user", "wrong-connection", invite)).rejects.toThrow("Wait 30 seconds");
    expect(mocks.decrypt).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("stores the encrypted URL under the current identity, with a new confirmation version", async () => {
    await saveSlackConnection("user-a", { webhookUrl: "secret-input", workspaceName: "Workspace", channelName: "#planning", source: "manual" });
    const stored = mocks.values.mock.calls[0][0];
    expect(stored.userId).toBe("user-a"); expect(stored.encryptedWebhookUrl).toBe("encrypted-only");
    expect(stored.connectionId).toMatch(/^[a-f0-9-]{36}$/); expect(JSON.stringify(stored)).not.toContain("secret-input");
  });
  it("exposes only destination metadata to the browser, scoped by identity", async () => {
    const where = vi.fn().mockReturnValue({ limit: async () => [] });
    mocks.select.mockReturnValue({ from: () => ({ where }) });
    expect(await getSlackDestination("user-a")).toBeNull();
    expect(Object.keys(mocks.select.mock.calls[0][0])).toEqual(["connectionId", "workspaceName", "channelName", "source"]);
    expect(new PgDialect().sqlToQuery(where.mock.calls[0][0]).params).toEqual(["user-a"]);
  });
});
