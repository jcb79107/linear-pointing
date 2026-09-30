import { describe, expect, it, vi } from "vitest";
import { slackApiError } from "./slack-http";
import { SlackDeliveryError } from "./slack";
describe("Slack error redaction", () => {
  it("does not expose database parameters or secrets in responses or logs", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = slackApiError(new Error("SQL params: encrypted-token, webhook-secret"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect(warn).toHaveBeenCalledWith("Slack connection or delivery operation failed");
    warn.mockRestore();
  });
  it("preserves safe delivery recovery instructions", async () => {
    const response = slackApiError(new SlackDeliveryError("Check Slack before retrying."));
    expect(response.status).toBe(502); expect(await response.json()).toEqual({ error: "Check Slack before retrying." });
  });
});
