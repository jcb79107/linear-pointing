import { z } from "zod";

export class SlackDeliveryError extends Error {}

export interface SlackDestination {
  connectionId: string;
  workspaceName: string;
  channelName: string;
  source: string;
}

export function isAllowedSlackWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "hooks.slack.com" &&
      !url.port && !url.username && !url.password && !url.search && !url.hash &&
      /^\/services\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(url.pathname);
  } catch { return false; }
}

export const slackWebhookSchema = z.object({
  webhookUrl: z.string().max(500).refine(isAllowedSlackWebhookUrl, "Use a Slack incoming webhook URL"),
  workspaceName: z.string().trim().min(1).max(80),
  channelName: z.string().trim().min(1).max(80),
});

export const slackOAuthResponseSchema = z.object({
  ok: z.literal(true),
  team: z.object({ id: z.string().min(1), name: z.string().min(1).max(80) }),
  incoming_webhook: z.object({
    url: z.string().refine(isAllowedSlackWebhookUrl),
    channel: z.string().min(1).max(80),
    channel_id: z.string().min(1),
  }),
});

export function formatSlackInvite(invite: { title: string; teamName: string; issueCount: number; inviteUrl: string }) {
  const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `Pointing session: ${escape(invite.title)}\n${invite.issueCount} ${invite.issueCount === 1 ? "issue" : "issues"} · ${escape(invite.teamName)}\n<${invite.inviteUrl}|Join the session>`;
}

export async function sendSlackWebhook(webhookUrl: string, text: string) {
  if (!isAllowedSlackWebhookUrl(webhookUrl)) throw new SlackDeliveryError("Reconnect Slack: the saved webhook is invalid.");
  let response: Response;
  try {
    response = await fetch(webhookUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, unfurl_links: false, unfurl_media: false }),
      redirect: "error", signal: AbortSignal.timeout(8000), cache: "no-store",
    });
  } catch {
    // Never include fetch errors: they can contain the secret webhook URL.
    throw new SlackDeliveryError("Slack delivery could not be confirmed. Check the channel before trying again, or copy the invite.");
  }
  if (!response.ok) {
    throw new SlackDeliveryError(response.status === 429
      ? "Slack is rate limiting invites. Wait before trying again, or copy the invite."
      : "Slack rejected the invite. Reconnect the channel in Settings, or copy the invite.");
  }
}
