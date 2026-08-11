import { requireCurrentUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { apiError, assertSameOrigin } from "@/lib/http";
import {
  getSessionInviteDetails,
  recordSessionAuditEvent,
} from "@/lib/sessions";
import { sendSlackInvite } from "@/lib/slack";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const env = getServerEnv();
    const details = await getSessionInviteDetails(id, user.id);

    if (!env.SLACK_INVITE_WEBHOOK_URL) {
      return Response.json(
        { error: "Connect a Slack channel before sending an invite" },
        { status: 503 },
      );
    }

    const inviteUrl = new URL(`/s/${details.code}`, env.APP_URL).toString();
    try {
      await sendSlackInvite(env.SLACK_INVITE_WEBHOOK_URL, {
        ...details,
        inviteUrl,
      });
      await recordSessionAuditEvent(id, user.id, "invite.slack_sent", {
        inviteUrl,
      });
    } catch (error) {
      await recordSessionAuditEvent(id, user.id, "invite.slack_failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
