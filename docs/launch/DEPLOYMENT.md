# Release deployment — September 30, 2026

- Production: https://public-linear-pointing.vercel.app/
- Immutable deployment: https://public-linear-pointing-9j9p8wi68-jcb79107s-projects.vercel.app
- Vercel ID: `dpl_5TskwGKTh4d1LuRcZJV7iUBPeQ2v`
- Deployed local revision: `74a1b33` (tree `1b048557ea2e430d54b3bb3787fd7bb0e71c3a3f`).
- Production build: Next.js 16.3.7, successful on Vercel.
- No new migrations beyond previously applied 0006/0007.

## Evidence

123 tests across 27 files pass. All 88 browser checks pass across Chromium desktop/tablet/phone and WebKit phone against the local production build and isolated fixtures. Lint, typecheck, production build, and strict static UI audit pass. Full npm audit: zero known vulnerabilities. Gitleaks scanned 18 commits with no findings.

Production probes passed for `/`, `/demo`, `/privacy`, `/support`, and `/api/health`. A clean browser opened the demo and revealed the round without page errors. The deployment's error-level log query returned zero records during verification; this is a short observation window, not proof of absence of all defects.

## Publication

GitHub authentication and explicitly approved workflow permission were restored on September 30. The complete local release is published in PR #4. Main now requires a pull request and the trusted GitHub Actions `verify` check, with force pushes/deletions blocked. CI includes the 123 tests, types/lint, dependency audit, production build, and Chromium/WebKit browser suite. Scheduled health checks activate on merge to main.

The first Linux run failed clean installation because optional `@emnapi` entries were missing from the lockfile. Regenerating with npm 10.9.9 fixed clean-install validation; the repaired revision is subject to the full required CI run before merge. Current checks and deployment status are linked from PR #4.

Anonymous `/api/sessions` and `DELETE /api/account` returned 401. The account page emitted an authentication redirect without account controls.

An isolated historical recovery drill passed on September 30; see [restore evidence](RESTORE-DRILL.md). Production still passed all public/health probes afterwards.

## Remaining gates

See [readiness](READINESS.md): disposable two-account / two-workspace provider exercise, a suitable history-retention window and populated-session recovery verification, notification delivery, and 2–3-team pilot. No employer tickets were changed during validation.
