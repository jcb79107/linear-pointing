import { ArrowLeft, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/Brand";

const variables = [
  "DATABASE_URL",
  "LINEAR_CLIENT_ID",
  "ALLOWED_LINEAR_ORG_KEY",
  "TOKEN_ENCRYPTION_KEY",
  "PUSHER_APP_ID / KEY / SECRET / CLUSTER",
  "SLACK_INVITE_WEBHOOK_URL (optional)",
];

export default function SetupPage() {
  return (
    <main className="setup-shell">
      <header className="simple-header">
        <Brand />
        <Link href="/">
          <ArrowLeft size={16} /> Back
        </Link>
      </header>
      <section className="setup-card">
        <div className="step-label">LOCAL SETUP</div>
        <h1>Connect the app.</h1>
        <p className="setup-lede">
          Linear Pointing needs Linear for identity and issues, Neon for room
          state, and Pusher for private live updates.
        </p>
        <ol className="setup-steps">
          <li>
            <span>1</span>
            <div>
              <b>Create a Linear OAuth app</b>
              <p>
                Set the callback to{" "}
                <code>/api/auth/linear/callback</code>. No admin scope is
                required.
              </p>
              <a
                href="https://linear.app/settings/api/applications/new"
                target="_blank"
                rel="noreferrer"
              >
                Open Linear settings <ExternalLink size={14} />
              </a>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <b>Create Neon and Pusher projects</b>
              <p>
                Use Neon&apos;s pooled connection string. Create a Pusher
                Channels app in the closest region.
              </p>
              <p>
                To send invites with one click, add an incoming webhook for
                your team&apos;s Slack channel.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <b>Copy the environment template</b>
              <p>
                Duplicate <code>.env.example</code> as{" "}
                <code>.env.local</code> and fill in:
              </p>
              <div className="variable-list">
                {variables.map((variable) => (
                  <code key={variable}>
                    <CheckCircle2 size={13} /> {variable}
                  </code>
                ))}
              </div>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <b>Apply the database migration</b>
              <div className="command">
                <code>npm run db:migrate</code>
                <Copy size={15} />
              </div>
            </div>
          </li>
        </ol>
        <Link className="button button-dark" href="/demo">
          Preview the experience first
        </Link>
      </section>
    </main>
  );
}
