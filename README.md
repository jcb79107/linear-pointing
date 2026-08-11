# Linear Pointing

Linear-native planning poker for a single Linear workspace. A facilitator
builds an ordered issue queue, shares one persistent room link, runs private
votes, and writes the agreed estimate back to Linear without switching tabs.

The app includes a service-free product demo at `/demo`.

## What is implemented

- Linear OAuth with PKCE, CSRF state validation, workspace restriction, and
  read-first/write-on-facilitation scopes
- encrypted OAuth tokens, server-side refresh, and opaque HTTP-only sessions
- one-click agenda creation from unestimated Todo issues in Linear's upcoming
  cycle, preserving the cycle's manual issue order
- individual-ticket search and adding before or during a session
- drag-to-reorder agenda preparation
- a simple 16:9 room with issue Markdown, attachments, embedded Figma designs,
  sub-issues, queue progress, roster, and voting controls
- one exact `0, 1, 2, 3, 4` scale for voting and Linear write-back
- secret replaceable votes, automatic/early reveal, observers,
  absences, late joins, revotes, skips, and issue revisit
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

1. Create a Linear OAuth application. Use this callback:

   `http://localhost:3000/api/auth/linear/callback`

2. Create a Neon database and use its pooled connection string.
3. Create a Pusher Channels app with private/presence channels enabled.
4. Copy `.env.example` to `.env.local` and fill every value. Generate the token
   key with `openssl rand -base64 32`.
5. Apply migrations and start the app:

```bash
npm install
npm run db:migrate
npm run dev
```

`ALLOWED_LINEAR_ORG_KEY` is the workspace key from
`linear.app/<workspace-key>` for the one permitted workspace. Pusher variables
may be omitted during early local development; the
room will use polling, but production should configure them.

`FACILITATOR_EMAILS` is a comma-separated list of users who may create sessions
by default. Other workspace members join as voters and can be promoted during a
session. To enable the Slack invite button, configure an incoming webhook in
`SLACK_INVITE_WEBHOOK_URL`; `SLACK_INVITE_CHANNEL` is the channel label shown in
the confirmation dialog.

Only teams configured with Linear's **Linear** estimate scale and **Allow zero
estimates** enabled appear in the team picker. This guarantees every `0`–`4`
vote can be written back without conversion.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The unit suite covers the exact pointing scale, finalizable votes,
snapshotted voter reveal rules, vote secrecy, permissions, queue progression,
and OAuth PKCE/state behavior.

## Deployment

Import the repository into Vercel, provision Neon and Pusher, and add the
variables from `.env.example` to Production and Preview. Set:

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
