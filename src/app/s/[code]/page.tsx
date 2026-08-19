import { ArrowRight, LogIn } from "lucide-react";
import { notFound } from "next/navigation";

import { Brand } from "@/components/Brand";
import { JoinSession } from "@/components/JoinSession";
import { getCurrentUser } from "@/lib/auth";
import { getPublicSessionPreview } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
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
          <p>
            Sign in with Linear to verify team access, review each ticket, and
            point from this device.
          </p>
          <a
            className="button button-primary button-large"
            href={`/api/auth/linear/start?returnTo=${encodeURIComponent(`/s/${code}`)}`}
          >
            <LogIn size={18} /> Join with Linear <ArrowRight size={18} />
          </a>
          <small>Only members with access to this Linear team can enter.</small>
        </section>
      </main>
    );
  }
  return <JoinSession code={code} session={session} />;
}
