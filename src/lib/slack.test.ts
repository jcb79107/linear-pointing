import { describe, expect, it } from "vitest";

import {
  formatSlackInvite,
  isAllowedSlackWebhookUrl,
} from "@/lib/slack";

describe("Slack session invitations", () => {
  it("formats a Slack-ready invitation and escapes user content", () => {
    expect(
      formatSlackInvite({
        title: "API <grooming>",
        teamName: "Platform & API",
        issueCount: 2,
        inviteUrl: "https://pointing.example/s/abc",
      }),
    ).toBe(
      "*Pointing session ready:* API &lt;grooming&gt;\n2 tickets · Platform &amp; API\n<https://pointing.example/s/abc|Join the pointing session>",
    );
  });

  it("only accepts Slack incoming webhook URLs", () => {
    expect(
      isAllowedSlackWebhookUrl(
        "https://hooks.slack.com/services/T123/B123/secret",
      ),
    ).toBe(true);
    expect(isAllowedSlackWebhookUrl("https://example.com/services/test")).toBe(
      false,
    );
  });
});
