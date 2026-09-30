import { ArrowRight, LogIn } from "lucide-react";
import { notFound } from "next/navigation";

import { Brand } from "@/components/Brand";
import { JoinSession } from "@/components/JoinSession";
import { getCurrentUser } from "@/lib/auth";
import { getPublicSessionPreview } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params, searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ authError?: string }>;
}) {
  const [{ code }, { authError }] = await Promise.all([params, searchParams]);
  const [user, session] = await Promise.all([
    getCurrentUser(),
    getPublicSessionPreview(code),
  ]);
  if (!session) notFound();
  if (!user) {
    return (
      <main className="auth-shell">
        <section className="join-card join-preview-card">
          <Brand />
          <span className="join-session-label">YOU’RE INVITED</span>
          <div>
            <h1>{session.title}</h1>
            <p>
              {session.teamName} · {session.issueCount}{" "}
              {session.issueCount === 1 ? "ticket" : "tickets"}
            </p>
          </div>
          {authError ? (
            <p className="join-auth-error" role="alert">
              {authError === "invalid_oauth_state"
                ? "That sign-in link expired. Your invitation is still here; start again below."
                : "Linear sign-in did not finish. Your invitation is still here; try again when you’re ready."}
            </p>
          ) : (
            <p>
              Sign in with Linear to confirm you can view <strong>{session.teamName}</strong> and open the session tickets.
            </p>
          )}
          <a
            className="button button-primary button-large"
            href={`/api/auth/linear/start?returnTo=${encodeURIComponent(`/s/${code}`)}`}
          >
            <LogIn size={18} /> Sign in with Linear <ArrowRight size={18} />
          </a>
          <small>Votes stay private until reveal. Your facilitator saves the agreed estimate to Linear.</small>
        </section>
      </main>
    );
  }
  return <JoinSession code={code} session={session} />;
}
