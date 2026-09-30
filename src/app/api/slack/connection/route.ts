import { slackApiError } from "@/lib/slack-http";
import { requireCurrentUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/http";
import { disconnectSlack, getSlackDestination, saveSlackConnection, slackOAuthConfigured } from "@/lib/slack-connections";
import { slackWebhookSchema } from "@/lib/slack";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return Response.json({ destination: await getSlackDestination(user.id), oauthAvailable: slackOAuthConfigured() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return slackApiError(error); }
}
export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const input = slackWebhookSchema.parse(await request.json());
    await saveSlackConnection(user.id, { ...input, source: "manual" });
    return Response.json({ destination: await getSlackDestination(user.id) });
  } catch (error) { return slackApiError(error); }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    await disconnectSlack(user.id);
    return Response.json({ success: true });
  } catch (error) { return slackApiError(error); }
}
