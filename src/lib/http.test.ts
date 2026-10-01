import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureException } from "@sentry/nextjs";
import { LinearAccessUnavailableError, RoomAccessDeniedError } from "./access-errors";
import { apiError } from "./http";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
import { safeReturnTo } from "@/lib/http";

describe("OAuth return destination", () => {
  it("preserves local invite and preparation paths", () => {
    expect(safeReturnTo("/s/ROOM123")).toBe("/s/ROOM123");
    expect(safeReturnTo("/app/sessions/id/prepare?from=invite")).toBe("/app/sessions/id/prepare?from=invite");
  });
  it.each([null, "https://example.com", "//example.com", "/\\example.com", "/\n/example.com", "/\t/example.com"])("rejects external or normalized external paths: %s", (path) => {
    expect(safeReturnTo(path)).toBe("/app");
  });
});

describe("unexpected errors", () => {
  it("does not return or log provider credentials or query details", async () => {
    const { apiError } = await import("./http");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = apiError(new Error("postgresql://user:secret@host SQL private-ticket"));
      const body = await response.json();
      expect(response.status).toBe(500);
      expect(body.reference).toMatch(/^[a-f0-9-]{36}$/);
      expect(JSON.stringify(body)).not.toContain("secret");
      expect(JSON.stringify(spy.mock.calls)).not.toContain("private-ticket");
    } finally { spy.mockRestore(); }
  });
});


describe("room access response contracts", () => {
  beforeEach(() => vi.mocked(captureException).mockClear());

  it("marks confirmed room denial with a stable machine-readable code", async () => {
    const error = new RoomAccessDeniedError();
    error.message = "Synthetic private provider data";
    const response = apiError(error);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "You no longer have access to this room.", code: "ROOM_ACCESS_DENIED",
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("keeps provider uncertainty retryable without retaining provider details", async () => {
    const error = new LinearAccessUnavailableError();
    error.message = "Synthetic private provider data";
    const response = apiError(error);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Unable to verify Linear access. Try again.", code: "LINEAR_ACCESS_UNAVAILABLE",
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("does not label a role-only prohibition as lost room access", async () => {
    const response = apiError(new Error("FORBIDDEN"));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Not allowed" });
    expect(captureException).not.toHaveBeenCalled();
  });
});
