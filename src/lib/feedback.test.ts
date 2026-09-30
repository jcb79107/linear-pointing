import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  flush: vi.fn(), stop: vi.fn(), startBuffering: vi.fn(), sendFeedback: vi.fn(), off: vi.fn(),
  listener: undefined as undefined | ((event: { contexts: { feedback: Record<string, unknown> } }) => void),
}));
vi.mock("@sentry/nextjs", () => ({
  getClient: () => ({ getDsn: () => ({}), on: (_: string, listener: typeof sdk.listener) => { sdk.listener = listener; return sdk.off; } }),
  getReplay: () => ({ getReplayId: () => "a".repeat(32), flush: sdk.flush, stop: sdk.stop, startBuffering: sdk.startBuffering }),
  sendFeedback: sdk.sendFeedback,
}));
import { sendPointedFeedback } from "./feedback";

describe("feedback submission", () => {
  beforeEach(() => { vi.clearAllMocks(); sdk.flush.mockResolvedValue(undefined); sdk.stop.mockResolvedValue(undefined); sdk.sendFeedback.mockResolvedValue("event"); });
  it("uploads the buffer only on submission, links it, and stops ongoing uploads", async () => {
    expect(sdk.flush).not.toHaveBeenCalled();
    sdk.sendFeedback.mockImplementationOnce(async () => {
      const event = { contexts: { feedback: {} } };
      sdk.listener?.(event);
      expect(event.contexts.feedback).toEqual({ replay_id: "a".repeat(32) });
    });
    await sendPointedFeedback("The queue jumps", "");
    expect(sdk.flush).toHaveBeenCalledWith({ continueRecording: false });
    expect(sdk.sendFeedback).toHaveBeenCalledWith({ message: "The queue jumps", email: undefined }, { includeReplay: false, attachments: undefined });
    expect(sdk.stop).toHaveBeenCalledWith({ flush: false });
    expect(sdk.startBuffering).toHaveBeenCalledOnce();
    expect(sdk.off).toHaveBeenCalledOnce();
  });
  it("returns to local buffering after a failed upload", async () => {
    sdk.sendFeedback.mockRejectedValueOnce(new Error("offline"));
    await expect(sendPointedFeedback("Retry this", "")).rejects.toThrow("offline");
    expect(sdk.stop).toHaveBeenCalledWith({ flush: false });
    expect(sdk.startBuffering).toHaveBeenCalledOnce();
    expect(sdk.off).toHaveBeenCalledOnce();
  });
});
