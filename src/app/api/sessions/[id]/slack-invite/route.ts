import { slackApiError } from "@/lib/slack-http";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/http";
import { getServerEnv } from "@/lib/env";
import { getSessionInviteDetails, recordSlackInviteOutcome } from "@/lib/sessions";
import { deliverSlackInvite } from "@/lib/slack-connections";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { id } = await params;
    const { connectionId } = z.object({ connectionId: z.string().uuid() }).parse(await request.json());
    const details = await getSessionInviteDetails(id, user.id);
    try {
      await deliverSlackInvite(user.id, connectionId, { ...details,
        inviteUrl: new URL(`/s/${details.code}`, getServerEnv().APP_URL).toString() });
    } catch (error) {
      await recordSlackInviteOutcome(id, user.id, false).catch(() => undefined);
      throw error;
    }
    // A logging failure must not tell the user that a delivered message failed.
    await recordSlackInviteOutcome(id, user.id, true).catch(() => undefined);
    return Response.json({ success: true });
  } catch (error) { return slackApiError(error); }
}
