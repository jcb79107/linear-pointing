import { LinearClient } from "@linear/sdk";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { linearConnections, users } from "@/db/schema";
import { createUserSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { safeReturnTo } from "@/lib/http";
import { validOAuthState } from "@/lib/oauth";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string | string[];
}

export async function GET(request: Request) {
  const env = getServerEnv();
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const state = requestUrl.searchParams.get("state");
  const expectedState = cookieStore.get("linear_oauth_state")?.value;
  const verifier = cookieStore.get("linear_oauth_verifier")?.value;
  const code = requestUrl.searchParams.get("code");
  const returnTo = safeReturnTo(
    cookieStore.get("linear_oauth_return")?.value ?? null,
  );

  if (!validOAuthState(state, expectedState) || !verifier || !code) {
    console.warn("Linear OAuth callback rejected invalid state", {
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      hasVerifier: Boolean(verifier),
      hasCode: Boolean(code),
    });
    return NextResponse.redirect(
      new URL("/app?authError=invalid_oauth_state", env.APP_URL),
    );
  }

  const tokenResponse = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      redirect_uri: env.LINEAR_REDIRECT_URI,
      client_id: env.LINEAR_CLIENT_ID,
      code_verifier: verifier,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const failure = (await tokenResponse
      .json()
      .catch(() => null)) as {
      error?: unknown;
      error_description?: unknown;
    } | null;
    console.warn("Linear OAuth token exchange failed", {
      status: tokenResponse.status,
      error:
        typeof failure?.error === "string" ? failure.error.slice(0, 120) : null,
      description:
        typeof failure?.error_description === "string"
          ? failure.error_description.slice(0, 240)
          : null,
    });
    return NextResponse.redirect(
      new URL("/app?authError=token_exchange_failed", env.APP_URL),
    );
  }

  const tokens = (await tokenResponse.json()) as TokenResponse;
  const client = new LinearClient({ accessToken: tokens.access_token });
  const viewer = await client.viewer;
  const organization = await viewer.organization;

  if (organization.urlKey !== env.ALLOWED_LINEAR_ORG_KEY) {
    console.warn("Linear OAuth rejected workspace", {
      receivedWorkspaceKey: organization.urlKey,
    });
    return NextResponse.redirect(
      new URL("/app?authError=wrong_workspace", env.APP_URL),
    );
  }

  const [user] = await db
    .insert(users)
    .values({
      linearUserId: viewer.id,
      organizationId: organization.id,
      email: viewer.email,
      displayName: viewer.displayName,
      avatarUrl: viewer.avatarUrl,
    })
    .onConflictDoUpdate({
      target: [users.organizationId, users.linearUserId],
      set: {
        email: viewer.email,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  const scopes = Array.isArray(tokens.scope)
    ? tokens.scope
    : tokens.scope.split(/[,\s]+/).filter(Boolean);
  await db
    .insert(linearConnections)
    .values({
      userId: user.id,
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: encryptSecret(tokens.refresh_token),
      scopes,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    })
    .onConflictDoUpdate({
      target: linearConnections.userId,
      set: {
        encryptedAccessToken: encryptSecret(tokens.access_token),
        encryptedRefreshToken: encryptSecret(tokens.refresh_token),
        scopes,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      },
    });

  await createUserSession(user.id);
  cookieStore.delete("linear_oauth_state");
  cookieStore.delete("linear_oauth_verifier");
  cookieStore.delete("linear_oauth_return");

  return NextResponse.redirect(new URL(returnTo, env.APP_URL));
}
