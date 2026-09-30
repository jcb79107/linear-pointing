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

The GitHub CLI credential expired, and Git push has no usable credential. GitHub connector publishing repeatedly timed out during approval review of file uploads. Some unattached Git objects were uploaded, but the branch reference was not moved; PR #4 still points at the older revision. The complete release remains committed locally. The public repository description has been updated to Pointed. Scheduled monitoring and expanded CI are not active on main. They activate after the complete snapshot is published, remote CI passes, and PR #4 is merged. Upload progress is preserved locally in `.git/pointed-publish-state.json`.

Anonymous `/api/sessions` and `DELETE /api/account` requests returned 401. The account page emitted a streamed authentication redirect with no account controls.

The proposed main-branch rule reached GitHub’s fresh-account confirmation screen and was not saved. Complete that confirmation before treating branch protection as active.

## Remaining gates

See [readiness](READINESS.md): disposable two-account / two-workspace provider exercise, Neon administrative reauthentication and isolated restore drill, notification delivery, and 2–3-team pilot. No employer tickets were changed during validation.
