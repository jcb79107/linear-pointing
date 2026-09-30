# Pointed launch readiness

Assessed September 29–30, 2026. Pointed is a public beta, not yet a broadly validated release.

## Verified locally

- 123 tests across 27 files pass, including database migrations/cascades, authenticated account deletion, private voting rules, cycle intake, and Slack request boundaries.
- Lint, TypeScript, and the Next.js 16.3.7 production build pass.
- All 88 Chromium desktop/tablet/phone and WebKit phone tests pass against the demo and isolated settings/queue fixtures.
- Full npm dependency audit reports zero known vulnerabilities after updating Next.js, sharp, and development dependencies.
- Gitleaks 8.30.1 reports no secrets in the 18-commit history or tracked/unignored release files.
- Landing/demo use Richard, Dinesh, and Gilfoyle as developers, with Jared facilitating.

These are synthetic/isolated tests, not proof of live provider writeback, multi-workspace isolation, field performance, or complete accessibility conformance.

## Delivered release safeguards

Public help and privacy pages; transactional, authenticated account deletion; same-origin logout; generic unexpected API errors with references; database health endpoint; CI with browser checks and dependency audit; scheduled production probes; contribution/security guidance; issue templates and dependency update automation. Monitoring schedules activate when merged to the default branch. Notification delivery remains unverified.

## Repository publication

The complete release is now published to PR #4 after refreshing GitHub CLI authentication and explicitly approving workflow permission. Remote CI is being verified before merge. The first Linux CI run exposed missing optional runtime entries in the npm lockfile; those were regenerated with CI’s npm version. Monitoring activates after merge to main.

## Required before broad promotion

1. Run a full session using a disposable Linear team and two authorized accounts: import the configured cycle, reorder/remove, browse independently, vote privately, reconnect, reveal, save an estimate, verify Linear, then delete the session. Repeat authorization checks across a second workspace. Live sign-in/team listing succeeded, but the available account exposed only an employer workspace, so no test session or ticket mutation was performed there.
2. Historical recovery was verified in an isolated branch: see [restore drill](RESTORE-DRILL.md). Retention is only 6 hours. Choose a longer recovery window before relying on this for broader use, and repeat with populated disposable sessions; the current database has none.
3. Run the small pilot with 2–3 real teams and observe a complete session. Collect failures and task friction, not just preferences. No pilot evidence is claimed.
4. Confirm failure notifications reach the maintainer. Health checks cover availability, not every application error. Measure actual traffic before claiming Core Web Vitals targets.

5. Finish GitHub account confirmation and save the prepared main-branch rule (pull requests, required `verify`, up-to-date branches, no force pushes/deletion). GitHub requested fresh account confirmation, so the rule is not yet active.

## Release operations

See [operations and recovery](OPERATIONS.md) and the final [deployment record](DEPLOYMENT.md). Older `docs/pilot` reports describe earlier builds and are retained as historical evidence.
