import { ArrowLeft, CheckCircle2, ExternalLink, Terminal } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/Brand";
import { CopySetupPrompt } from "@/components/CopySetupPrompt";

const variables = [
  "DATABASE_URL",
  "LINEAR_CLIENT_ID",
  "TOKEN_ENCRYPTION_KEY",
];

export default function SetupPage() {
  const localAppUrl = "http://localhost:3000";
  const callbackUrl = `${localAppUrl}/api/auth/linear/callback`;
  const repositoryUrl = "https://github.com/jcb79107/linear-pointing";
  const linearSetupUrl = new URL(
    "https://linear.app/settings/api/applications/new",
  );
  linearSetupUrl.searchParams.set("distribution", "public");
  linearSetupUrl.searchParams.set("display.description", "Planning poker that imports issues and writes estimates back to Linear.");
  linearSetupUrl.searchParams.set("developer.name", "Linear Pointing");
  linearSetupUrl.searchParams.set("oauth.client_name", "Linear Pointing");
  linearSetupUrl.searchParams.set("oauth.client_uri", localAppUrl);
  linearSetupUrl.searchParams.append(
    "oauth.redirect_uris",
    callbackUrl,
  );
  linearSetupUrl.searchParams.append("oauth.grant_types", "authorization_code");
  const setupPrompt = `Set up Linear Pointing for me from ${repositoryUrl}.

Please:
1. Clone or open the repository and read README.md and .env.example.
2. Install its dependencies.
3. Help me create a public Linear OAuth application. Use ${callbackUrl} as its callback URL.
4. Create or connect a Postgres database, then configure .env.local with APP_URL, LINEAR_CLIENT_ID, LINEAR_REDIRECT_URI, TOKEN_ENCRYPTION_KEY, and DATABASE_URL. Pusher is optional.
5. Run the database migration and start the app locally.
6. Verify that the homepage loads and that the Connect Linear flow reaches Linear OAuth.

Never print or commit secrets. When I must authorize an account, click a web form, or paste a secret, pause and tell me exactly what to do in plain language. Otherwise, handle the setup yourself.`;

  return (
    <main className="setup-shell">
      <header className="simple-header">
        <Brand />
        <Link href="/">
          <ArrowLeft size={16} /> Back
        </Link>
      </header>
      <section className="setup-card">
        <div className="step-label">FASTEST SETUP</div>
        <h1>Let your coding agent set it up.</h1>
        <p className="setup-lede">
          Paste this into Codex, Claude Code, Cursor, or any coding agent that
          can edit files and run terminal commands. It will do the routine work
          and pause when you need to authorize Linear or add a secret.
        </p>
        <div className="agent-setup">
          <div className="agent-setup-heading">
            <span><Terminal size={16} /></span>
            <div>
              <b>One prompt, then follow along</b>
              <small>Your agent will ask before it needs access or a secret.</small>
            </div>
          </div>
          <pre><code>{setupPrompt}</code></pre>
          <CopySetupPrompt prompt={setupPrompt} />
        </div>

        <details className="manual-setup">
          <summary>Prefer to set it up yourself?</summary>
          <p>
            You need Node.js, a Linear account, and a Postgres database. These
            steps take you from a fresh clone to a running app.
          </p>
          <ol className="setup-steps">
            <li>
              <span>1</span>
              <div>
                <b>Download and install</b>
                <p>Clone the repository, open it in a terminal, then run:</p>
                <div className="command"><code>npm install</code></div>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <b>Create a Linear OAuth app</b>
                <p>
                  Open the pre-filled form, create the public app, and copy its
                  client ID. The callback URL is <code>{callbackUrl}</code>.
                </p>
                <a href={linearSetupUrl.toString()} target="_blank" rel="noreferrer">
                  Open the Linear form <ExternalLink size={14} />
                </a>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <b>Create a Postgres database</b>
                <p>
                  A free Neon database is a simple option. Copy its pooled
                  connection string; any compatible Postgres database works.
                </p>
              </div>
            </li>
            <li>
              <span>4</span>
              <div>
                <b>Add the app settings</b>
                <p>
                  Copy <code>.env.example</code> to <code>.env.local</code>, then
                  fill in these required values:
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
              <span>5</span>
              <div>
                <b>Create the tables and start the app</b>
                <div className="command"><code>npm run db:migrate</code></div>
                <div className="command"><code>npm run dev</code></div>
                <p>Open <code>http://localhost:3000</code>, then connect Linear.</p>
              </div>
            </li>
          </ol>
        </details>
      </section>
    </main>
  );
}
