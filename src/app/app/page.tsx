import { ArrowRight, LogIn } from "lucide-react";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { DashboardClient } from "@/components/DashboardClient";
import { getCurrentUser } from "@/lib/auth";
import { isAppConfigured } from "@/lib/env";
import { listLinearTeams } from "@/lib/linear";
import { getUserSettings } from "@/lib/settings";
import { listPokerSessions } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const authErrors: Record<string, string> = {
  invalid_oauth_state: "The Linear sign-in expired. Please try again.",
  token_exchange_failed: "Linear could not complete sign-in. Please try again.",
};

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  if (!isAppConfigured()) redirect("/setup");
  const user = await getCurrentUser();
  const { authError } = await searchParams;

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <Brand />
          <div>
            <h1>Sign in with Linear</h1>
            <p>Use your Linear account to create or join a pointing session.</p>
          </div>
          {authError && (
            <div className="form-error">
              {authErrors[authError] ?? "Linear sign-in could not be completed."}
            </div>
          )}
          <a
            className="button button-primary button-large"
            href="/api/auth/linear/start?returnTo=/app"
          >
            <LogIn size={18} /> Continue with Linear <ArrowRight size={18} />
          </a>
          <small>
            Read access is used to show tickets. Session facilitators also grant
            write access so the final estimate can be applied.
          </small>
        </section>
      </main>
    );
  }

  const [teams, sessions, settings] = await Promise.all([
    listLinearTeams(user.id),
    listPokerSessions(user.id, user.organizationId),
    getUserSettings(user.id),
  ]);

  return (
    <DashboardClient
      user={{
        name: user.displayName,
        avatarUrl: user.avatarUrl,
      }}
      teams={teams}
      settings={settings}
      initialSessions={sessions.map((session) => ({
        ...session,
        updatedAt: session.updatedAt.toISOString(),
      }))}
    />
  );
}
