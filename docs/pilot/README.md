# Small-team pilot kit

Goal: help 2–3 teams run one real refinement session each, observe friction, and decide whether to invest further. No participants have been recruited and no usage results are claimed here.

**Status:** ready to recruit a first team; not yet cleared for an unattended real session. The public deployment differs from this checkout. Before running the session, complete the release and integration gates in [readiness.md](readiness.md). This guide describes the inspected checkout (`codex/pm-grooming-workflow`, base `e6209c6bbf91a46e6be6e6aeb54dccf5a9246ba4`) plus the local pilot fixes. It must be matched to the deployed revision before sending as operating instructions.

## 1. Invitation — draft only

> Would your team try Linear Pointing in one upcoming refinement session? I’m inviting 2–3 teams to help test the basics: choose Linear issues, vote privately, discuss an estimate, and save it back to Linear. I’d join to observe where the app gets in your way, then ask for five minutes of feedback. Plan on 30 minutes with 3–5 issues and your usual teammates. Everyone needs Linear access to the same team; the facilitator also needs permission to authorize estimate updates. It’s an early pilot, and we’ll check setup together before the session. Would you be open to being the first team?
>
> Optional preview: https://public-linear-pointing.vercel.app/demo — sample data only; this is a single-browser simulation, not a shared room.

Send this personally to one facilitator you already know. Do not broadcast or imply that other teams have participated.

## 2. Getting started

1. **Connect.** Open https://public-linear-pointing.vercel.app/app and choose **Continue with Linear**. Use the workspace containing the intended team. Initial sign-in requests read access. Creating a session requests additional write access; only proceed if your organization permits it. On this checkout, the permission round-trip returns to the dashboard, so choose **New session** again and re-enter the name/team.
2. **Create.** Choose **New session**, name it, select the Linear team, and create it. Estimates must be enabled on that team. New sessions automatically inherit the team’s native scale, zero allowance, extended values, and T-shirt labels. Missing team? Check workspace, team access, and estimate settings with your Linear administrator.
3. **Prepare 3–5 issues.** In the agenda builder, search by title or identifier and add selected tickets, or use **Add all matches** with narrow filters. New-user default intake is any cycle, Todo, unestimated, any assignee; existing users retain their saved filters. An empty result does not mean the integration is broken: try any cycle and the appropriate Backlog/Todo/In Progress and estimate filters. Review the resulting agenda; order it with the sort selector or drag handles. Verify it has the intended issues before starting.
4. **Invite.** Optionally open **Settings → Slack**, connect with OAuth and choose your channel (or use the webhook setup instructions). **Send to Slack** in preparation or the room shows a destination/message confirmation before sending. The owner must complete [Slack setup](../slack-setup.md) before hosted OAuth works. Alternatively use **Copy Slack invite** from preparation or **Copy link** in the room, then paste it yourself into your normal team channel. Copying does not send anything. Teammates open `/s/<code>`, sign in with Linear, and must belong to the same workspace with access to the selected team. They wait until the facilitator starts. A copied `/demo` link is not a shared session. If clipboard access fails, copy the link shown in the error. If sign-in fails, retry from the original invitation link.
5. **Start and estimate.** Check the joined roster, then **Start live session**. The creator facilitates without voting by default; change their role to **Facilitator + voter** if wanted. Participants select a card and can change it before reveal. Default auto-reveal waits for every eligible voter, including an absent person; the facilitator can change roles or choose **Reveal early**. Discuss disagreement; **Start another round** discards that round’s votes for a revote. Late joiners may wait for the next round if votes were already revealed.
6. **Decide and save.** The suggested result is the numeric average rounded up to a valid card. It is a starting point for discussion, not automatic consensus. The facilitator may choose another card, then **Save estimate & next** writes to Linear and advances. **Skip ticket** advances without writing an estimate. If Linear has changed, cancel the overwrite prompt and inspect the issue before deciding. On a timeout or ambiguous failure, check Linear and refresh the room before retrying; do not assume that an error means nothing was written.
7. **Record and finish.** Choose **Finish for now**, or finish the queue, then **Copy summary**. The summary records estimated/skipped/not-discussed outcomes, estimates, and timing. **Resume … remaining** continues pending work. Record reasoning, unanswered questions, and follow-up owners in your existing notes; this checkout has no decision-note input. Saving estimates does not post these external notes as Linear comments. Keep the room until pilot review is complete; deleting it also removes its audit history.

**Version warning:** the live demo observed during review has **Estimate & mark ready**, **Needs details**, **Split**, **Park**, and a decision-note field. Their live integration behavior was not verified. Do not substitute those controls into this guide without reviewing the deployed version. No new notes feature is needed for this pilot; existing team notes are sufficient.

## 3. First-session checklist

### Before the calendar session

- [ ] Owner matches the deployed revision and screen labels to this guide; records the SHA and URL.
- [ ] Owner completes the safe integration smoke in readiness.md with explicit authorization for the disposable Linear issue. This was not performed in this review.
- [ ] Facilitator confirms everyone has the correct Linear workspace/team access and estimates are enabled; identifies who is allowed to grant write permission.
- [ ] Agree which real issues may be updated during the pilot. Prepare 3–5 issues and keep the normal refinement workflow available as fallback.
- [ ] Share the persistent room link; arrange the normal call. Choose one observer and an existing private notes location. Ask before recording audio/video; recording is not necessary.

### During 30 minutes

- [ ] First 5 minutes: watch sign-in/join without coaching immediately; note the point of hesitation and any help given. Check roster and roles before starting.
- [ ] Next 20 minutes: discuss and vote, reveal, decide, save, and verify the first agreed estimate in Linear. Try one skip or revote only if the discussion naturally calls for it.
- [ ] If votes stall, check absent/observer roles. If synchronization lags, allow the documented 10-second polling fallback or refresh. If save outcome is uncertain, inspect Linear before retrying.
- [ ] Stop on wrong-issue writes, exposed private votes, or access to the wrong team. Record the error/time, stop writes, and return to the team’s normal process.
- [ ] Final 5 minutes: finish, copy the summary, record follow-up owners, and ask the five questions below.

### Immediately afterward

- [ ] Record actual completion, help required, time to first vote, time to first confirmed save, items discussed/estimated/skipped, and any abandoned step. Unknown stays unknown.
- [ ] Add observations to findings.csv; link sanitized evidence and distinguish observed behavior from suggestions.
- [ ] Fix a session-stopping problem before booking the next pilot. Repeat with team 2, and team 3 if useful; use the same checklist.

## 4. Five feedback questions

1. Where did you first hesitate or need help, and what did you expect to happen?
2. Was it straightforward to get the right issues and teammates into the session? What took extra work?
3. Did private voting and the suggested estimate help the discussion? When did you override or distrust the result?
4. How confident were you about what was saved to Linear and what still needed follow-up? What evidence was missing?
5. Would you use this for your next refinement instead of your current process? Why, and what single change would matter most?

## 5. Findings and investment decision

Use [findings.csv](findings.csv) in an existing spreadsheet or text editor. It intentionally has no invented participant rows. Use team aliases, never tokens, private issue descriptions, personal votes, or unnecessary names in this repository. Keep sensitive evidence in the team’s existing restricted notes and put only a reference here.

Prioritize by impact first, then observed recurrence, then effort:

- **P0 — stop:** wrong write, authorization/privacy failure, unrecoverable data loss. Stop the pilot until fixed and verified.
- **P1 — before next team:** cannot join, prepare, vote, or save, with no workable recovery; or repeated facilitator intervention prevents a usable session.
- **P2 — later:** friction with a reasonable documented workaround, such as re-entering the session form after initial write consent.
- **P3 — park:** cosmetic changes, speculative features, new analytics, and broader redesigns without evidence.

For each session, record: team alias, date, deployed SHA, invited/joined counts, completion yes/partial/no, interventions, first-vote/save elapsed minutes, outcomes, and willingness to repeat (actual answer only). These are a proposed observation plan, not usage data.

After 2–3 sessions, review with the facilitators. Continue modest investment if at least two teams finish the core flow, trust the saved result, and want to use it again; prioritize the one recurring impediment. Iterate narrowly if teams finish only with substantial help. Pause if they cannot complete safely or prefer their current process without a compelling improvement. These are pilot decision rules, not statistical claims.

### Existing diagnostics are enough

The app already records `participant.joined`, `session.started`, reveal/revote/role changes, `issue.skipped`, `estimate.finalized`, `linear.writeback_succeeded`, `linear.writeback_failed`, and `session.ended` in `audit_events` (see `src/lib/sessions.ts`, `src/db/schema.ts`). OAuth callback failures have server warnings. Use existing deployment logs for request failures and these events for chronology; manually record hesitation/help because logs cannot explain it. Rejoins and revotes can repeat, so event counts are not unique people or issues. `session.ended` may mean “finished for now,” not all issues estimated.

An authorized operator can use this read-only query with the pilot session UUID as a parameter; it deliberately omits metadata and identities:

```sql
SELECT created_at, event_type
FROM audit_events
WHERE session_id = $1
ORDER BY created_at;
```

No production logs/database were accessed in this review. No tracking platform was added.
