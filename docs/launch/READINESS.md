# Pointed launch readiness

Assessed September 29, 2026. Pointed is a public beta, not yet a broadly validated release.

## Verified locally

- 123 tests across 27 files pass, including database migrations/cascades, authenticated account deletion, private voting rules, cycle intake, and Slack request boundaries.
- Lint, TypeScript, and the Next.js 16.3.7 production build pass.
- Chromium desktop/tablet/phone and WebKit phone exercise the demo and isolated settings/queue fixtures. See the final deployment record for browser results.
- Full npm dependency audit reports zero known vulnerabilities after updating Next.js, sharp, and development dependencies.
- Gitleaks 8.30.1 reports no secrets in the 17-commit history or tracked/unignored release files.
- Landing/demo use Richard, Dinesh, and Gilfoyle as developers, with Jared facilitating.

These are synthetic/isolated tests, not proof of live provider writeback, multi-workspace isolation, field performance, or complete accessibility conformance.

## Delivered release safeguards

Public help and privacy pages; transactional, authenticated account deletion; same-origin logout; generic unexpected API errors with references; database health endpoint; CI with browser checks and dependency audit; scheduled production probes; contribution/security guidance; issue templates and dependency update automation. Monitoring schedules activate when merged to the default branch. Notification delivery remains unverified.

## Required before broad promotion

1. Run a full session using a disposable Linear team and two authorized accounts: import the configured cycle, reorder/remove, browse independently, vote privately, reconnect, reveal, save an estimate, verify Linear, then delete the session. Repeat authorization checks across a second workspace. Live sign-in/team listing succeeded, but the available account exposed only an employer workspace, so no test session or ticket mutation was performed there.
2. Reauthenticate Neon administration, confirm the restore window, and perform an isolated restore drill. Existing administrative authentication was invalid; database access alone is not a restore test.
3. Run the small pilot with 2–3 real teams and observe a complete session. Collect failures and task friction, not just preferences. No pilot evidence is claimed.
4. Confirm failure notifications reach the maintainer. Health checks cover availability, not every application error. Measure actual traffic before claiming Core Web Vitals targets.

## Release operations

See [operations and recovery](OPERATIONS.md) and the final [deployment record](DEPLOYMENT.md). Older `docs/pilot` reports describe earlier builds and are retained as historical evidence.
