import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { randomToken } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { safeReturnTo } from "@/lib/http";
import { createPkceChallenge } from "@/lib/oauth";

export async function GET(request: Request) {
  const env = getServerEnv();
  const requestUrl = new URL(request.url);
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = createPkceChallenge(verifier);
  const write = requestUrl.searchParams.get("write") === "true";
  const returnTo = safeReturnTo(requestUrl.searchParams.get("returnTo"));

  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  cookieStore.set("linear_oauth_state", state, options);
  cookieStore.set("linear_oauth_verifier", verifier, options);
  cookieStore.set("linear_oauth_return", returnTo, options);

  const authorize = new URL("https://linear.app/oauth/authorize");
  authorize.searchParams.set("client_id", env.LINEAR_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", env.LINEAR_REDIRECT_URI);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", write ? "read,write" : "read");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  if (write) authorize.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorize);
}
