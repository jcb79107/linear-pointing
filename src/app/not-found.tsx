import Link from "next/link";

import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="join-card not-found-card">
        <Brand />
        <p className="join-session-label">INVITE UNAVAILABLE</p>
        <h1>This session link can’t be opened.</h1>
        <p>Ask the facilitator for the latest invite. If you’re exploring Pointed, you can see a sample session first.</p>
        <div className="not-found-actions">
          <Link className="button button-primary button-large" href="/demo">Try the sample session</Link>
          <Link className="button button-ghost button-large" href="/">Go to Pointed</Link>
        </div>
      </section>
    </main>
  );
}
