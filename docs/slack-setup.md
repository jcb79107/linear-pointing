# Slack setup and MVP settings

## What a facilitator does

1. Sign in to their intended Linear workspace, then open **Settings → Slack → Connect Slack**.
2. On Slack’s authorization screen, choose their workspace and destination channel. Workspace admin approval may be required.
3. Return to Pointed. Settings displays the connected workspace/channel. No message is sent by connecting.
4. In agenda preparation or the room, select **Send to Slack**, review the destination and session invite, then **Send invite**. **Copy Slack invite / Copy link** remains available.
5. Use **Change Slack channel** to authorize another channel, or **Disconnect** to remove the connection from Pointed. Disconnect does not revoke the webhook at Slack; revoke it there if it should be invalidated completely.

One destination is stored per facilitator’s Linear identity and workspace. Another facilitator cannot read or use it. Switching Linear workspaces uses a different connection. This is deliberately not a shared deployment-wide webhook.

Slack OAuth can supply a channel-bound webhook through the `incoming-webhook` scope; no channel-history or channel-list access is needed. See [Slack OAuth](https://docs.slack.dev/authentication/installing-with-oauth/) and [incoming webhooks](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/).

## One-time deployment setup

This is the remaining prerequisite before hosted OAuth is plug-and-play for users. It has not been performed by this task.

1. Create/select a Slack app controlled by the deployment owner in Slack app management. Enable **Incoming Webhooks** and request the **incoming-webhook** bot scope.
2. Add the exact HTTPS redirect URL under OAuth & Permissions: `https://<your-app-origin>/api/auth/slack/callback`. It must match `APP_URL` plus that path. Slack requires HTTPS; plain localhost OAuth is not a deployment test.
3. Enable distribution for installation into other Slack workspaces through Slack’s **Manage Distribution** setup. Complete its required configuration. Individual workspace administrators can still restrict installations; the app cannot bypass that policy.
4. Configure server-only `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` through the deployment’s existing secret management. Do not use `NEXT_PUBLIC_` variables or paste secrets into chat. Keep the existing encryption key stable.
5. Apply the generated additive migration `drizzle/0006_slack_connections.sql` through the normal `npm run db:migrate` process on the intended database **before** deploying the new app code. Review and authorize the target explicitly. The migration passed disposable embedded PostgreSQL tests; it has not been applied to a shared or hosted database.
6. Deploy the reviewed revision, then perform the authorized live verification below. Do not claim OAuth is operational merely because credentials were configured.

No app-wide Slack webhook, bot token, event subscription, worker, or new service is required. The implementation currently accepts standard commercial Slack `hooks.slack.com` webhooks; GovSlack and enterprise-wide installations are outside this MVP.

## Fallback when OAuth is unavailable

Settings exposes **Use an incoming webhook**. The facilitator supplies their webhook URL, workspace label, and channel label. The URL is encrypted server-side and never returned to the browser. Labels are entered by the user; the webhook determines the actual channel, so the UI reminds them to check it in Slack.

The expandable **Instructions for your AI assistant** contains a copyable, concrete setup prompt. It asks the agent to help select an existing channel, obtain authorization, enter the secret securely into the authenticated settings form, and save without sending. It explicitly forbids putting webhook secrets in chats/logs/source or sending a test message. Source: `src/lib/slack-setup.ts`.

Saving a webhook checks its allowed URL shape, not whether Slack has revoked it. Actual delivery errors direct the facilitator to reconnect or copy the invite.

## Settings contract

| Control | Purpose and scope |
| --- | --- |
| Linear connection | Connect/switch the workspace supplying identities, issues, and estimates; any workspace can connect if its policies permit. |
| Inherited estimate cards | New sessions always fetch the selected team’s current scale, zero allowance, extended values, and T-shirt labels. No deck override in the MVP. Existing room cards are unchanged. |
| Slack connection | Private destination for that facilitator’s current Linear account/workspace; save/connect/disconnect apply immediately. |
| Auto-reveal | Personal default copied into new sessions; manual reveal/revote remains available. |
| Ticket intake | Personal defaults for cycle, status categories, estimated state, and assignee. These are app filters, not inherited Linear UI preferences. New-user default: any cycle, Todo, unestimated, anyone. |
| Agenda order | Personal default, initially Linear’s issue manual order. Other standard sorts serve agenda preparation. No custom rule builder. |
| Appearance | System/light/dark, applied immediately and saved on the device. |

**Save defaults** saves the workflow defaults. Slack changes and appearance save separately. Changing defaults does not rewrite live room decks or auto-reveal settings. Intake defaults are read when preparation/live-room pages load, so they are not immutable session configuration. Legacy deck and custom-sort values remain in the database for migration compatibility but are normalized to Linear inheritance/standard ordering when read or saved.

## Verification and operation

Automated checks use mocked Slack responses; no messages were sent by this work. They cover state validation, cancellation, account-switch rejection, malformed OAuth responses, connection ownership, ciphertext storage, restricted webhook hosts/no redirects, escaped mentions, server-owned invite content, denied facilitator access, and no retry on ambiguous delivery. An atomic per-connection 30-second cooldown prevents concurrent duplicate sends; changed connections invalidate old confirmations. A timeout can still deliver, so users are told to inspect the channel before retrying. An audit failure after successful delivery does not report a false send failure.

An isolated browser fixture exercises the actual settings/invite components with mocked API responses: empty state, connect return, fallback form, save, disconnect, confirmation/cancel, keyboard focus, simulated success/failure, auto-reveal, and mobile dark mode. This is UI evidence, not live OAuth or database integration proof.

Before a real pilot, use an explicitly authorized test Slack channel and disposable Linear team/issue to verify: OAuth connect/cancel/reconnect, separate user/workspace destinations, selected channel receives exactly one reviewed invite, voters cannot send, revoked webhook recovery, copy fallback, and inherited T-shirt/zero/extended cards. Sending that message still requires explicit user authorization. Review migration application on a safe database too.

Browser-side timeouts, network failures, and malformed success responses also count as unconfirmed delivery. The UI tells the facilitator to check the channel before trying again; only an explicit successful API result displays “Invite sent.” No automatic retry is made.

Run `npm test -- src/lib/slack-persistence.test.ts` to exercise the complete migration chain and production connection queries in a disposable disk-backed PGlite database, using a fixture encryption key and mocked outbound HTTP. Coverage includes existing settings/deck preservation, the new-row cycle default, ciphertext after closing/reopening the database, separate users/workspaces, stale confirmations, cooldown retention, and foreign-key/cascade behavior. PGlite uses a single connection; the competing-call test does not prove multi-connection locking or Neon networking. See [latest evidence](pilot/verification.md).

For the currently named public app, the exact proposed Slack redirect is `https://public-linear-pointing.vercel.app/api/auth/slack/callback`, with `APP_URL=https://public-linear-pointing.vercel.app`. Confirm that this is the intended release origin before granting permissions or configuring credentials. No Slack app configuration was changed during this continuation.

Audit event names: `invite.slack_sent` and `invite.slack_failed`. No webhook URLs, tokens, or raw OAuth payloads are included. Existing logs and audit events suffice; no tracking platform was added. Roll back app code if needed; the additive connection table can remain. Do not rotate the encryption key casually or drop stored connections during a rollback.
