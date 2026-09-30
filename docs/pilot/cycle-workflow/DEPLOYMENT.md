# Production deployment — September 28, 2026

- URL: https://public-linear-pointing.vercel.app/
- Immutable deployment: https://public-linear-pointing-fn8nijb6r-jcb79107s-projects.vercel.app
- Deployment ID: `dpl_9yTS7oyAL87cQywnJkf7AgkgScWU`
- Target/status: production / READY
- Source: verified local working tree based on `e6209c6`, including uncommitted changes; not represented as a clean commit release.
- Framework/build: Next.js 16.3.0, remote Turbopack build completed in 35 seconds.
- Previous deployment for code rollback: `dpl_DJJx2fnAyQGTK9up3aYNiomwHzMK` / https://public-linear-pointing-7loupw2wn-jcb79107s-projects.vercel.app

Applied migrations 0006 and 0007 against the database obtained from this project's production environment. Verified eight migration ledger entries and the new Slack connection, shared defaults, and session intake/defaults columns. Retain these additive schema changes if rolling back application code.

Post-deployment smoke checks passed at desktop and phone widths: landing page, navigation into demo, individual revealed votes, save controls, skip/advance, and no browser page errors. Both new read endpoints rejected unauthenticated requests with 401. These demo interactions did not write estimates or modify real sessions. See `production-smoke.json` and `production-1440.png` / `production-390.png`.

The initial smoke script completed both browser journeys but used the Playwright response accessor on a native fetch Response during the final API check. The accessor was corrected, and the API checks then passed; no application change was necessary.

An error-level log scan scoped to this deployment over the preceding ten minutes returned no matching logs. Drains and long-term monitoring were not audited. Authenticated cycle import, team settings, Linear write-back, Slack delivery, and multi-user synchronization still require real-team verification.

Added `.vercelignore` to exclude credentials, build/test reports, local agent files, and audit artifacts. Temporary pulled production credentials were removed after migration verification. Vercel used its stored production secrets for the build and runtime.
