import { describe, expect, it, vi } from "vitest";
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
