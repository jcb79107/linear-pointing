import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  trigger: vi.fn(),
  authorize: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("pusher", () => ({
  default: class {
    constructor(options: unknown) { mocks.create(options); }
    trigger = mocks.trigger;
    authorizeChannel = mocks.authorize;
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.trigger.mockReset().mockResolvedValue(undefined);
  vi.stubEnv("APP_URL", "https://pointed.test");
  vi.stubEnv("LINEAR_CLIENT_ID", "fixture-client");
  vi.stubEnv("LINEAR_REDIRECT_URI", "https://pointed.test/api/auth/linear/callback");
  vi.stubEnv("TOKEN_ENCRYPTION_KEY", "fixture-encryption-key");
  vi.stubEnv("DATABASE_URL", "postgresql://fixture@localhost/pointed_test");
  vi.stubEnv("PUSHER_APP_ID", "app-fixture");
  vi.stubEnv("PUSHER_KEY", "key-fixture");
  vi.stubEnv("PUSHER_SECRET", "secret-fixture");
  vi.stubEnv("PUSHER_CLUSTER", "eu");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("polling-only realtime fallback", () => {
  it.each([undefined, "", " \t "])(
    "broadcast is a no-op when all Pusher values are %j",
    async (value) => {
      for (const name of ["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET", "PUSHER_CLUSTER"]) {
        vi.stubEnv(name, value);
      }
      const { broadcastSessionChanged } = await import("./realtime");
      await expect(broadcastSessionChanged("session-fixture", "vote-updated")).resolves.toBeUndefined();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.trigger).not.toHaveBeenCalled();
    },
  );

  it.each(["PUSHER_APP_ID", "PUSHER_KEY", "PUSHER_SECRET"])(
    "stays polling-only when one credential is blank: %s",
    async (name) => {
      vi.stubEnv(name, "");
      const { broadcastSessionChanged } = await import("./realtime");
      await expect(broadcastSessionChanged("session-fixture", "participant-joined")).resolves.toBeUndefined();
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.trigger).not.toHaveBeenCalled();
    },
  );

  it("cannot authorize a realtime channel when Pusher is disabled", async () => {
    vi.stubEnv("PUSHER_SECRET", "");
    const { authorizePresenceChannel } = await import("./realtime");
    expect(() => authorizePresenceChannel("socket-fixture", "presence-session-fixture", {
      id: "user-fixture", displayName: "Fixture", avatarUrl: null,
    })).toThrow("Realtime is not configured");
    expect(mocks.authorize).not.toHaveBeenCalled();
  });

  it("broadcasts minimal change notifications when configured, using the default cluster if blank", async () => {
    vi.stubEnv("PUSHER_CLUSTER", "");
    const { broadcastSessionChanged } = await import("./realtime");
    await broadcastSessionChanged("session-fixture", "vote-updated");
    expect(mocks.create).toHaveBeenCalledWith({
      appId: "app-fixture", key: "key-fixture", secret: "secret-fixture",
      cluster: "us2", useTLS: true,
    });
    expect(mocks.trigger).toHaveBeenCalledWith("presence-session-session-fixture", "session-changed", {
      reason: "vote-updated",
    });
  });

  it("keeps a Pusher outage from failing an accepted database action", async () => {
    mocks.trigger.mockRejectedValue(new Error("Fixture provider unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { broadcastSessionChanged } = await import("./realtime");
    await expect(broadcastSessionChanged("session-fixture", "vote-updated")).resolves.toBeUndefined();
    expect(mocks.trigger).toHaveBeenCalledOnce();
  });

  it("limits presence metadata to the opaque ID used by the room UI", async () => {
    const { authorizePresenceChannel } = await import("./realtime");
    authorizePresenceChannel("socket-fixture", "presence-session-fixture", {
      id: "user-fixture", displayName: "Private name", avatarUrl: "https://example.test/private-photo",
    });
    expect(mocks.authorize).toHaveBeenCalledExactlyOnceWith(
      "socket-fixture", "presence-session-fixture", { user_id: "user-fixture" },
    );
  });
});
