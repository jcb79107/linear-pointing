import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseLinearError, type LinearErrorType } from "@linear/sdk";
import { LinearAccessUnavailableError } from "./access-errors";
import { getLinearAccessToken, userHasTeamAccess } from "./linear";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  update: vi.fn(),
  team: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
    update: mocks.update,
  },
}));
vi.mock("@/lib/crypto", () => ({
  decryptSecret: () => "synthetic-only",
  encryptSecret: vi.fn(),
}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ LINEAR_CLIENT_ID: "synthetic-client" }),
}));
vi.mock("@linear/sdk", async (importOriginal) => ({
  ...await importOriginal<typeof import("@linear/sdk")>(),
  LinearClient: class { team = mocks.team; },
}));

function connection(expired = false) {
  return {
    expiresAt: new Date(Date.now() + (expired ? -3600000 : 3600000)),
    encryptedAccessToken: "synthetic-access",
    encryptedRefreshToken: "synthetic-refresh",
    scopes: ["read"],
  };
}
function sdkError(status: number, types: string[] = []) {
  return parseLinearError({
    message: "Synthetic private provider detail",
    response: {
      status,
      // The SDK parser reads lower-case wire values although its raw type
      // advertises the normalized enum. Exercise the actual parser behavior.
      errors: types.map((type) => ({ extensions: { type: type as LinearErrorType } })),
    },
  });
}
async function expectUnavailable(promise: Promise<unknown>) {
  await expect(promise).rejects.toEqual(new LinearAccessUnavailableError());
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.limit.mockResolvedValue([connection()]);
  mocks.team.mockResolvedValue({ id: "team" });
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
  expect(mocks.update).not.toHaveBeenCalled();
});

describe("current Linear team-access classification", () => {
  it("confirms only the requested team using an existing connection", async () => {
    expect(await userHasTeamAccess("user", "team")).toBe(true);
    expect(mocks.team).toHaveBeenCalledExactlyOnceWith("team");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("denies a different returned team", async () => {
    mocks.team.mockResolvedValue({ id: "different-team" });
    expect(await userHasTeamAccess("user", "team")).toBe(false);
  });

  it("confirms denial when no connection exists without contacting the provider", async () => {
    mocks.limit.mockResolvedValue([]);
    expect(await userHasTeamAccess("user", "team")).toBe(false);
    expect(mocks.team).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["HTTP 401", sdkError(401)],
    ["HTTP 403", sdkError(403)],
    ["GraphQL authentication", sdkError(200, ["authentication error"])],
    ["GraphQL forbidden", sdkError(200, ["forbidden"])],
    ["secondary GraphQL forbidden", sdkError(200, ["unknown", "forbidden"])],
    ["raw transport authentication", { response: { status: 401 } }],
    ["raw GraphQL forbidden", { response: { status: 200, errors: [{ extensions: { type: "forbidden" } }] } }],
  ])("confirms denial for %s", async (_name, error) => {
    mocks.team.mockRejectedValue(error);
    expect(await userHasTeamAccess("user", "team")).toBe(false);
  });

  it.each([
    ["rate limit", sdkError(429)],
    ["HTTP timeout", sdkError(408)],
    ["HTTP server error", sdkError(500)],
    ["HTTP unavailable", sdkError(503)],
    ["GraphQL rate limit", sdkError(200, ["ratelimited"])],
    ["GraphQL network", sdkError(200, ["network error"])],
    ["GraphQL internal", sdkError(200, ["internal error"])],
    ["mixed rate-limit/authentication errors", sdkError(200, ["authentication error", "ratelimited"])],
    ["authentication label on unavailable transport", sdkError(503, ["authentication error"])],
    ["unclassified HTTP 400", sdkError(400)],
    ["unclassified HTTP 404", sdkError(404)],
    ["unclassified GraphQL error", sdkError(200, ["unknown"])],
    ["network exception", new TypeError("fetch failed: synthetic-private-token")],
    ["untrusted error-message wording", new Error("forbidden synthetic-private-token")],
    ["missing error shape", undefined],
  ])("keeps %s retryable without exposing provider details", async (_name, error) => {
    mocks.team.mockRejectedValue(error);
    await expectUnavailable(userHasTeamAccess("user", "team"));
  });
});

describe("token-refresh access classification", () => {
  beforeEach(() => {
    mocks.limit.mockResolvedValue([connection(true)]);
  });

  it.each([
    [401, {}],
    [403, {}],
    [400, { error: "invalid_grant", error_description: "Synthetic private grant" }],
    [400, { error: "invalid_token" }],
    [400, { error: "access_denied" }],
  ])("confirms known OAuth denial for HTTP %s and %j", async (status, body) => {
    mocks.fetch.mockResolvedValue(Response.json(body, { status }));
    expect(await userHasTeamAccess("user", "team")).toBe(false);
    expect(mocks.team).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      "https://api.linear.app/oauth/token", expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
  });

  it.each([
    [401, { error: "invalid_client" }],
    [403, { error: "unauthorized_client" }],
    [400, { error: "invalid_client" }],
    [400, { error: "unauthorized_client" }],
    [400, { error: "invalid_request" }],
    [400, { error: "unknown" }],
    [408, {}],
    [429, { error: "invalid_grant" }],
    [500, {}],
    [503, { error: "invalid_grant" }],
  ])("keeps uncertain OAuth HTTP %s and %j retryable", async (status, body) => {
    mocks.fetch.mockResolvedValue(Response.json(body, { status }));
    await expectUnavailable(userHasTeamAccess("user", "team"));
    expect(mocks.team).not.toHaveBeenCalled();
  });

  it("treats a malformed OAuth error body as uncertainty", async () => {
    mocks.fetch.mockResolvedValue(new Response("Synthetic malformed response", { status: 400 }));
    await expectUnavailable(userHasTeamAccess("user", "team"));
  });

  it("treats a refresh network failure as uncertainty", async () => {
    mocks.fetch.mockRejectedValue(new TypeError("Synthetic token-bearing network exception"));
    await expectUnavailable(userHasTeamAccess("user", "team"));
  });

  it("does not encode provider status or raw body in retryable refresh errors", async () => {
    mocks.fetch.mockResolvedValue(new Response("Synthetic provider-private details", { status: 503 }));
    await expectUnavailable(getLinearAccessToken("user"));
  });
});
