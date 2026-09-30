import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { slackConnections } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { formatSlackInvite, sendSlackWebhook, type SlackDestination } from "@/lib/slack";

export function slackOAuthConfigured() {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

export async function getSlackDestination(userId: string): Promise<SlackDestination | null> {
  const [row] = await db.select({
    connectionId: slackConnections.connectionId,
    workspaceName: slackConnections.workspaceName,
    channelName: slackConnections.channelName,
    source: slackConnections.source,
  }).from(slackConnections).where(eq(slackConnections.userId, userId)).limit(1);
  return row ?? null;
}

export async function saveSlackConnection(userId: string, input: {
  webhookUrl: string; workspaceName: string; channelName: string; source: "oauth" | "manual";
}) {
  const values = {
    connectionId: randomUUID(), encryptedWebhookUrl: encryptSecret(input.webhookUrl),
    workspaceName: input.workspaceName, channelName: input.channelName, source: input.source,
    updatedAt: new Date(),
  };
  await db.insert(slackConnections).values({ userId, ...values })
    .onConflictDoUpdate({ target: slackConnections.userId, set: values });
}

export async function disconnectSlack(userId: string) {
  await db.delete(slackConnections).where(eq(slackConnections.userId, userId));
}

export async function deliverSlackInvite(userId: string, connectionId: string, invite: {
  title: string; teamName: string; issueCount: number; inviteUrl: string;
}) {
  // Atomic reservation prevents double clicks/concurrent requests sending duplicates.
  // Retain the cooldown on failure: a timeout may still have delivered the message.
  const [connection] = await db.update(slackConnections).set({ lastSentAt: new Date() })
    .where(and(eq(slackConnections.userId, userId), eq(slackConnections.connectionId, connectionId),
      or(isNull(slackConnections.lastSentAt), lt(slackConnections.lastSentAt, new Date(Date.now() - 30_000)))))
    .returning();
  if (!connection) throw new Error("UNPROCESSABLE:Slack destination changed or an invite was just attempted. Wait 30 seconds and reopen Send to Slack.");
  await sendSlackWebhook(decryptSecret(connection.encryptedWebhookUrl), formatSlackInvite(invite));
}
