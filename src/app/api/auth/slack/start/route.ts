import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { slackOAuthConfigured } from "@/lib/slack-connections";

export async function GET() {
  const { APP_URL } = getServerEnv();
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/app", APP_URL));
  if (!slackOAuthConfigured()) return NextResponse.redirect(new URL("/app/settings?slack=unavailable#slack", APP_URL));
  const state = randomToken();
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("slack_oauth_state", state, options);
  jar.set("slack_oauth_user", user.id, options);
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", new URL("/api/auth/slack/callback", APP_URL).toString());
  return NextResponse.redirect(url);
}
