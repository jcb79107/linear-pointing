import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestSlackInvite } from "./slack-invite-request";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("Slack invite browser delivery recovery", () => {
  it("requires checking the channel after a timeout and never retries automatically", async () => {
    fetchMock.mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const result = requestSlackInvite("fixture", "connection").catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(await result).toEqual(new Error("Slack delivery could not be confirmed. Check the channel before trying again, or copy the invite."));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats network failure as ambiguous delivery", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(requestSlackInvite("fixture", "connection")).rejects.toThrow("Check the channel before trying again");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["<html>proxy response</html>", "{}", '{"success":false}', "null"]) (
    "does not claim delivery for a malformed success response: %s", async (body) => {
      fetchMock.mockResolvedValue(new Response(body));
      await expect(requestSlackInvite("fixture", "connection")).rejects.toThrow("Check the channel before trying again");
    },
  );

  it("keeps actionable server errors and accepts only confirmed success", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "Reconnect the channel in Settings." }, { status: 502 }));
    await expect(requestSlackInvite("fixture", "connection")).rejects.toThrow("Reconnect the channel in Settings.");
    fetchMock.mockResolvedValueOnce(Response.json({ success: true }));
    await expect(requestSlackInvite("fixture", "connection")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ connectionId: "connection" }));
  });
});
