import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getServerEnv } from "./env";

const pusherVariables = [
  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",
  "PUSHER_CLUSTER",
] as const;

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://pointed.test");
  vi.stubEnv("LINEAR_CLIENT_ID", "fixture-client");
  vi.stubEnv("LINEAR_REDIRECT_URI", "https://pointed.test/api/auth/linear/callback");
  vi.stubEnv("TOKEN_ENCRYPTION_KEY", "fixture-encryption-key");
  vi.stubEnv("DATABASE_URL", "postgresql://fixture@localhost/pointed_test");
  for (const name of pusherVariables) vi.stubEnv(name, undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("optional Pusher configuration", () => {
  it.each([undefined, "", " \t "])(
    "uses polling defaults when optional values are %j",
    (value) => {
      for (const name of pusherVariables) vi.stubEnv(name, value);
      expect(getServerEnv()).toMatchObject({
        PUSHER_APP_ID: "disabled",
        PUSHER_KEY: "disabled",
        PUSHER_SECRET: "disabled",
        PUSHER_CLUSTER: "us2",
      });
    },
  );

  it("accepts the checked-in example after filling only required secrets", () => {
    const example = readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    for (const line of example.split("\n")) {
      const match = /^(PUSHER_\w+)=(.*)$/.exec(line);
      if (match) vi.stubEnv(match[1], match[2]);
    }
    expect(() => getServerEnv()).not.toThrow();
    expect(getServerEnv().PUSHER_KEY).toBe("disabled");
  });

  it("retains configured Pusher values and trims surrounding whitespace", () => {
    vi.stubEnv("PUSHER_APP_ID", " app-fixture ");
    vi.stubEnv("PUSHER_KEY", " key-fixture ");
    vi.stubEnv("PUSHER_SECRET", " secret-fixture ");
    vi.stubEnv("PUSHER_CLUSTER", " eu ");
    expect(getServerEnv()).toMatchObject({
      PUSHER_APP_ID: "app-fixture",
      PUSHER_KEY: "key-fixture",
      PUSHER_SECRET: "secret-fixture",
      PUSHER_CLUSTER: "eu",
    });
  });

  it.each(["LINEAR_CLIENT_ID", "TOKEN_ENCRYPTION_KEY", "DATABASE_URL"])(
    "still rejects missing required configuration: %s",
    (name) => {
      vi.stubEnv(name, "");
      expect(() => getServerEnv()).toThrow(`Missing or invalid server configuration: ${name}`);
    },
  );

  it("reports invalid field names without disclosing configuration values", () => {
    vi.stubEnv("APP_URL", "invalid-private-fixture");
    expect(() => getServerEnv()).toThrow("Missing or invalid server configuration: APP_URL");
    expect(() => getServerEnv()).not.toThrow("invalid-private-fixture");
  });
});
