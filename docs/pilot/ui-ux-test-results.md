# UI and UX verification — September 27, 2026

> Historical evidence. For current release status, see [launch readiness](../launch/READINESS.md). Later fixes and deployments supersede the status statements below.

Tested the current project checkout against a local production build at port 3003.
The earlier temporary release snapshot is no longer present. This report does not
verify the currently deployed Vercel snapshot.

## Results

- Playwright: **36/36 passed**, 8.8 seconds, Chromium.
- Viewports: 1440 × 1000, 677 × 1324, 390 × 844; header reflow also checked at 320 px.
- Axe: no WCAG A/AA rule violations detected in the scanned landing page,
  facilitator voting, voter, revealed-vote, and mixed-outcome summary states,
  in both light and dark appearance at all three viewport sizes.
- Existing Vitest suite: **106/106 passed** across 23 files.
- ESLint, TypeScript, and production webpack build passed.
- Final desktop and phone screenshots inspected visually.

## Behavior covered

- Skip every ticket and verify the final count and skipped outcomes.
- Reveal votes, restart a round, choose a final estimate, and advance.
- Finish and resume with the remaining tickets preserved.
- Change a private vote; voters cannot access facilitator controls.
- Keyboard voting and opening/dismissing shortcut help.
- Failed clipboard permission provides selectable summary text.
- Landing demo navigation and browser Back.
- Reflow without horizontal page overflow; readable mobile finish icon.
- Selected final estimate exposed through aria-pressed.

## Fixes from this pass

- Darkened light-theme metadata and secondary text tokens.
- Replaced hardcoded room metadata colors that failed in either theme.
- Corrected contrast of landing preview labels and summary statuses/timer.
- Replaced clipped mobile “Finish for now” text with an accessible icon button.
- Added the selected state for final-estimate buttons to accessibility semantics.
- Gave Skip a minimum 44 px height.

## Local performance sample

Unthrottled local production build, one fresh browser context per viewport,
recorded immediately after initial rendering. These are diagnostic samples,
not field Core Web Vitals or a performance guarantee.

| Width | Observed LCP | Initial CLS | Load event | Resource transfer |
| --- | --- | --- | --- | --- |
| 1440 | 44 ms | 0.000042 | 64 ms | 251 KB |
| 390 | 36 ms | 0 | 60 ms | 251 KB |

## Limits

The demo simulates participants and results. Browser tests block `/api/` traffic;
they do not verify real Linear writes, OAuth, shared multi-browser sessions,
reconnection, or server-side role enforcement. Only Chromium was run. Automated
accessibility scans do not prove WCAG conformance or replace screen-reader and
real-team usability testing. Full text enlargement and field INP remain untested.

## Run again

```sh
npm ci
npx playwright install chromium
npm run test:ui
npm run test:ui:report
```

By default the suite starts or reuses the development server on port 3002.
To test a production build, start it in another terminal, then supply its URL:

```sh
npx next build --webpack
npm run start -- --port 3003
# In a separate terminal:
UI_TEST_BASE_URL=http://localhost:3003 npm run test:ui
```

The HTML report lives in `playwright-report/`. Failed checks retain screenshots
and traces in `test-results/`; both directories are ignored by Git. Tests are in
`tests/e2e/demo.spec.ts`, with viewport settings in `playwright.config.ts`.
