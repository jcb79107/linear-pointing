import { afterEach, describe, expect, it, vi } from "vitest";
import { formatSlackInvite, isAllowedSlackWebhookUrl, sendSlackWebhook } from "@/lib/slack";
const webhook = "https://hooks.slack.com/services/T123/B123/secret";
afterEach(() => vi.unstubAllGlobals());
describe("Slack delivery boundary", () => {
  it.each(["http://hooks.slack.com/services/T/B/s", "https://hooks.slack.com.evil.test/services/T/B/s", "https://user:pass@hooks.slack.com/services/T/B/s", "https://hooks.slack.com/services/T/B/s?redirect=evil", "https://hooks.slack.com:444/services/T/B/s", "https://example.com/services/T/B/s"])("rejects unsafe webhook: %s", (url) => expect(isAllowedSlackWebhookUrl(url)).toBe(false));
  it("accepts a channel-bound webhook and escapes mentions", () => {
    expect(isAllowedSlackWebhookUrl(webhook)).toBe(true);
    expect(formatSlackInvite({ title: "<!channel>", teamName: "A & B", issueCount: 1, inviteUrl: "https://pointed.test/s/ABC" }))
      .toBe("Pointing session: &lt;!channel&gt;\n1 issue · A &amp; B\n<https://pointed.test/s/ABC|Join the session>");
  });
  it("posts once without redirects or link unfurls", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("ok")); vi.stubGlobal("fetch", fetch);
    await sendSlackWebhook(webhook, "test invite");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(webhook, expect.objectContaining({ redirect: "error", body: JSON.stringify({ text: "test invite", unfurl_links: false, unfurl_media: false }) }));
  });
  it("does not expose secrets or retry an ambiguous network failure", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error(`failed ${webhook}`)); vi.stubGlobal("fetch", fetch);
    await expect(sendSlackWebhook(webhook, "test")).rejects.toThrow("Check the channel");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not fetch an invalid destination", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(sendSlackWebhook("https://example.com", "test")).rejects.toThrow("invalid");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports Slack rejection without leaking the response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret error", { status: 403 })));
    await expect(sendSlackWebhook(webhook, "test")).rejects.toThrow("Slack rejected");
  });
});
