# Linear Pointing

The simple, open-source planning poker app for Linear. A product manager builds
an ordered issue queue, shares one persistent room link, runs private votes,
and leaves every ticket with a clear grooming decision without switching tabs.

The app includes a service-free product demo at `/demo`.
The product decisions behind the configurable workflow are documented in
[`docs/product-research.md`](docs/product-research.md).

## What is implemented

- public Linear OAuth with PKCE, CSRF state validation, and read-first / optional
  write scopes; there is no workspace allowlist
- encrypted OAuth tokens, server-side refresh, and opaque HTTP-only sessions
- personal settings for pointing decks, auto-reveal, ticket intake, and agenda
  ordering defaults
- ticket intake by active/upcoming/any cycle; Backlog, Todo, and In Progress
  status; estimate state; assignee scope; or an existing Linear custom view
- one-click agenda creation from matching Linear issues
- individual-ticket search and adding before or during a session
- Linear, priority, age, recency, identifier, title, and custom multi-rule sort
  presets, plus drag-to-reorder agenda preparation
- a simple 16:9 room with issue Markdown, attachments, embedded Figma designs,
  sub-issues, queue progress, roster, and voting controls
- every native Linear estimate scale plus compatible Linear, Fibonacci,
  powers-of-two, and custom numeric decks
- ticket-readiness checks for description, acceptance criteria, owner, and project
- secret replaceable votes, configurable automatic reveal, early reveal,
  facilitator voting, observers, absences, late joins, revotes, and issue revisit
- explicit Ready, Needs details, Split, and Parked decisions; optional decision
  notes are written back to the Linear issue
- pause/resume and a copyable session summary so grooming can stop on time
- conflict detection before Linear estimate overwrite
- PostgreSQL-authoritative recovery and Pusher presence notifications that
  never contain vote values
- audit events for lifecycle, reveal, roster, revote, and Linear write-back

## Architecture

- Next.js 16 App Router + React 19 + TypeScript
- Neon Postgres + Drizzle ORM
- Pusher private presence channels
- Linear SDK / GraphQL
- Vercel deployment

Postgres is canonical. Realtime events contain only a room ID-derived channel
and a change reason; clients refetch an authorization-filtered snapshot. A
10-second polling fallback keeps the room recoverable during a Pusher outage.

## Local setup

1. Open `/setup` and use the pre-filled Linear OAuth application form. Keep the
   distribution set to **Public** and use this callback:

   `http://localhost:3000/api/auth/linear/callback`

2. Create a Neon database and use its pooled connection string.
3. Copy `.env.example` to `.env.local` and fill the required values. Generate the token
   key with `openssl rand -base64 32`.
4. Apply migrations and start the app:

```bash
npm install
npm run db:migrate
npm run dev
```

Pusher is optional. Without it, the room uses a 10-second polling fallback. Add
the Pusher variables when you want more responsive live updates.

All Linear teams with estimates enabled appear in the team picker. The default
deck mirrors the selected team's exact scale. Custom decks are intentionally
validated against that scale so every card can be written back without a lossy
or surprising conversion.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The unit suite covers pointing-scale compatibility, custom agenda sorting,
finalizable votes,
snapshotted voter reveal rules, vote secrecy, permissions, queue progression,
and OAuth PKCE/state behavior.

## Deployment

Import the repository into Vercel, provision Neon, and add the variables from
`.env.example` to Production and Preview. Set:

- `APP_URL` to the production origin
- `LINEAR_REDIRECT_URI` to
  `https://<production-origin>/api/auth/linear/callback`

Then run `npm run db:migrate` against the production Neon connection before
first use. Never expose `PUSHER_SECRET`, `TOKEN_ENCRYPTION_KEY`, or
`DATABASE_URL` as `NEXT_PUBLIC_*`.

## License

Licensed under the [MIT License](LICENSE).

## Security model

- All mutating endpoints enforce an authenticated same-origin request.
- Every room snapshot requires persisted membership.
- Every participant is checked against the room's Linear team when joining.
- The server refetches selected issues; queue metadata is never trusted from the
  browser.
- Unrevealed vote values are removed from snapshots and never enter Pusher.
- The final vote insert and automatic reveal share a row-locked transaction.
- Estimate finalization row-locks the round, refetches Linear, performs an
  idempotent update, records the outcome, and advances the queue.
- Linear Markdown is sanitized. Authenticated Linear images are fetched by a
  restricted server proxy, so OAuth tokens never reach the browser.
