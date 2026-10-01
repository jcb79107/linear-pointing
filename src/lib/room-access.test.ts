import { describe, expect, it } from "vitest";
import { shouldClearRoom } from "./room-access";

describe("room access recovery", () => {
  it("clears the room when authentication expires or room access is denied", () => {
    expect(shouldClearRoom(401, {})).toBe(true);
    expect(shouldClearRoom(403, { code: "ROOM_ACCESS_DENIED" })).toBe(true);
  });
  it.each([400, 403, 409, 429, 500, 503])("does not confuse status %s with confirmed room access loss", (status) => {
    expect(shouldClearRoom(status, { error: "Request failed" })).toBe(false);
    expect(shouldClearRoom(status, null)).toBe(false);
  });
  it("keeps cached data during a temporary access-check outage", () => {
    expect(shouldClearRoom(503, { code: "LINEAR_ACCESS_UNAVAILABLE" })).toBe(false);
  });
});
