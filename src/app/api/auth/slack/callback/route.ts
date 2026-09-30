import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { validOAuthState } from "@/lib/oauth";
import { slackOAuthResponseSchema } from "@/lib/slack";
import { saveSlackConnection, slackOAuthConfigured } from "@/lib/slack-connections";

export async function GET(request: Request) {
  const { APP_URL } = getServerEnv();
  const finish = (status: string) => NextResponse.redirect(new URL(`/app/settings?slack=${status}#slack`, APP_URL));
  const jar = await cookies();
  const expected = jar.get("slack_oauth_state")?.value;
  const owner = jar.get("slack_oauth_user")?.value;
  jar.delete("slack_oauth_state"); jar.delete("slack_oauth_user");
  const user = await getCurrentUser();
  const url = new URL(request.url);
  if (!user || user.id !== owner || !validOAuthState(url.searchParams.get("state"), expected)) return finish("expired");
  if (url.searchParams.has("error")) return finish("cancelled");
  const code = url.searchParams.get("code");
  if (!code || !slackOAuthConfigured()) return finish("failed");
  try {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.SLACK_CLIENT_ID!, client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: new URL("/api/auth/slack/callback", APP_URL).toString() }),
      signal: AbortSignal.timeout(10000), redirect: "error", cache: "no-store",
    });
    if (!response.ok) return finish("failed");
    const result = slackOAuthResponseSchema.safeParse(await response.json());
    if (!result.success) return finish("failed");
    const data = result.data;
    await saveSlackConnection(user.id, { webhookUrl: data.incoming_webhook.url,
      channelName: data.incoming_webhook.channel, workspaceName: data.team.name, source: "oauth" });
    return finish("connected");
  } catch {
    // OAuth responses and network errors can contain secrets; never log them.
    return finish("failed");
  }
}
