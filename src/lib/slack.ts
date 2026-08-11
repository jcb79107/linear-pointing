export interface SlackInvite {
  title: string;
  teamName: string;
  issueCount: number;
  inviteUrl: string;
}

function escapeSlackText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatSlackInvite(invite: SlackInvite): string {
  return [
    `*Pointing session ready:* ${escapeSlackText(invite.title)}`,
    `${invite.issueCount} ${invite.issueCount === 1 ? "ticket" : "tickets"} · ${escapeSlackText(invite.teamName)}`,
    `<${invite.inviteUrl}|Join the pointing session>`,
  ].join("\n");
}

export function isAllowedSlackWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "hooks.slack.com" &&
      url.pathname.startsWith("/services/")
    );
  } catch {
    return false;
  }
}

export async function sendSlackInvite(
  webhookUrl: string,
  invite: SlackInvite,
): Promise<void> {
  if (!isAllowedSlackWebhookUrl(webhookUrl)) {
    throw new Error("The Slack webhook URL is invalid");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: formatSlackInvite(invite) }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Slack could not send the session invite");
  }
}
