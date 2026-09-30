# Cycle workflow and UX improvements

Implemented and locally verified September 27, 2026. Not deployed.

## Delivered behavior

- Shared defaults per Linear team: current cycle, next cycle (default), two or three cycles ahead, or no cycle; Linear manual/priority/oldest import order; automatic/manual reveal; facilitator voting off/on.
- One import loads all unestimated, unfinished tickets from the selected source. Zero counts as an estimate. Completed/canceled tickets stay out. More than 1,000 tickets produces an explicit recovery message instead of silent truncation.
- A draft stores its resolved cycle ID and dates. Reloading the same source preserves that cycle across calendar rollover. Choosing another source requires loading it before starting.
- Agenda preview supports drag, keyboard, and move buttons, sorting, and removal without changing Linear. Failed imports preserve the previous agenda. Concurrent draft changes reject stale replacement.
- Mobile agenda navigation and individual revealed votes; participant browsing stays local and disables voting while another ticket is being read.
- Consistent estimated/skipped/remaining counts and skipped-ticket revisit. Linear save confirmation appears only after a successful server response.
- Settings explain shared team scope, preserve unsaved drafts when switching teams, show explicit save feedback, and protect unsaved edits when leaving.
- A visible facilitator/participant demo switch, consistent Silicon Valley characters and estimate scale, simpler creation/invitation copy, accessible conflict confirmation, and contrast fixes.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | 118 passed across 25 files |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build -- --webpack` | Passed |
| `UI_TEST_BASE_URL=http://127.0.0.1:3006 npm run test:ui` | 57 passed; no retries |
| Premium UI static audit, strict mode | Zero findings |
| `git diff --check` | Passed |

Browser coverage includes desktop 1440×1000, tablet 677×1324, phone 390×844, and a 320px header check. Tests exercise keyboard reorder/voting, preview failures, missing/empty cycles, settings failure/recovery, role switching, browse-ahead, reveal, revote, save/advance, skip, finish/resume, and summary copying. Axe checks passed in the covered states; this is not a blanket WCAG compliance claim.

The first full run against the development server passed 56/57. Its trace showed a full development reload during the remaining vote-change test. The full rerun against the production build passed 57/57 without retries or assertion changes.

Actual application service queries and the migration chain run against disposable PGlite databases, with Linear and realtime transports mocked. Tests cover shared team persistence, organization isolation, inaccessible-team denial, non-facilitator denial, source pinning, eligibility, and failed/stale import preservation. SDK boundary tests cover pagination and issue filters.

Preparation/settings browser tests render the real components with synthetic accounts and mocked HTTP responses in an isolated temporary Next app. The fixture has no copied environment credentials. Demo tests run against the local production build. All browser tests use this repository's Playwright package and fresh contexts.

Single local Chromium samples of production `/demo` measured LCP 48ms desktop / 40ms phone and observed CLS 0. These unthrottled localhost readings are diagnostics only; field Core Web Vitals and INP are unmeasured. See [raw measurements](performance.json).

## Visual evidence

Screenshots were inspected after automated checks. That inspection caught oversized agenda rows from inherited CSS, which were fixed before the final pass.

- [Desktop agenda](agenda-desktop.png)
- [Phone agenda](agenda-phone.png)
- [Desktop settings](settings-desktop.png)
- [Phone settings](settings-phone.png)
- [Phone revealed votes, production build](revealed-phone.png)

## Release and recovery

Migration `0007_team_cycle_defaults.sql` adds the shared-default table and nullable session intake/defaults columns. It has been exercised on disposable databases only. Before deploying the new app, apply pending migrations to the intended environment using the existing release process and `npm run db:migrate`; confirm the target database first. The pending chain also includes the earlier Slack migration.

The schema change is additive: deploy the migration before the application. If the application must be rolled back, retain the new table and nullable columns; do not drop shared settings or session intake records. Existing sessions remain readable with null intake/defaults. Diagnose failures through sanitized API errors and the session ID; do not log tokens or full ticket bodies.

After an authorized release, verify two real users sharing team defaults, cycle import/manual ordering, preview edits surviving refresh, a cycle rollover draft, live voting/reconnect, and confirmed Linear estimate write-back. Live OAuth, Neon transport/locking, real Linear data/writes, Slack delivery, and multi-user realtime were not verified in this local pass. No production data or deployment was changed.
