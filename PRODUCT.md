# Product direction

## Mission

Make grooming in Linear feel lighter: open a queue, discuss one issue at a
time, vote, record the decision, and move on. The app is free, open source, and
purpose-built for product managers and teams that already use Linear.

## Product principles

1. **Linear is the system of record.** Import from Linear, link back to Linear,
   and write estimates and useful decision notes to Linear.
2. **The facilitator should stay in flow.** The current issue, readiness gaps,
   votes, decision, and next issue belong on one screen.
3. **Every discussion ends clearly.** A ticket is Ready with an estimate, Needs
   details, should be Split, or is Parked.
4. **Defaults remove ceremony.** A team can reuse its preferred deck, intake
   filters, Linear custom views, reveal behavior, and sort order.
5. **Private votes, shared understanding.** Votes stay hidden until reveal;
   consensus is a conversation aid, never an automatic product decision.
6. **The default decision is explainable.** Average the submitted numeric votes
   and round up to the next estimate value supported by the Linear team. The
   facilitator can still choose another value after discussion.
7. **Self-hosting stays boring.** Linear OAuth and Postgres are the only
   required services. Realtime infrastructure is optional.

## Canonical product-manager workflow

1. A product manager prepares tickets in Linear before grooming.
2. Shortly before the meeting, they create a pointing session and pull the
   upcoming cycle's unestimated Todo tickets by default. Every intake rule is
   editable, including custom Linear views.
3. They review readiness, put the tickets in the desired order, copy the Slack
   invite, and watch the team join with their Linear accounts.
4. Once the room is loaded, the facilitator starts the session. Every developer
   can inspect the Linear description, attachments, sub-issues, and linked Figma
   at their own pace on a computer or phone.
5. Developers either request more context or vote privately. When votes reveal,
   the app averages them and rounds up to the next valid Linear estimate card.
6. The facilitator confirms or overrides the suggestion, writes it to Linear,
   and advances to the next ticket.
7. The room tracks total meeting time and time per ticket until the queue is
   complete, parked, split, or marked as needing details.

## Deliberate non-goals

- Jira, GitHub Issues, or generic task-tool integrations
- AI-generated requirements or estimates
- billing, subscriptions, or enterprise controls
- a replacement for Linear projects, roadmaps, or reporting
- branding work before the workflow is genuinely excellent

## Roadmap

### Now

- Make the full grooming loop fast, recoverable, and accessible.
- Make Linear custom views and sensible personal defaults the shortest path to
  a useful agenda.
- Dogfood the public entry, waiting room, readiness intake, keyboard workflow,
  rounded-average decision, and meeting timers with real grooming teams.
- Keep public setup documented and deployment reproducible.

### Next

- Let teams save a small number of reusable grooming profiles when one set of
  personal defaults is no longer enough.
- Add privacy-conscious, aggregate workflow measurements only after observed
  sessions identify the questions they need to answer.
- Add lightweight decision-history insights only when they help improve ticket
  readiness or meeting quality.

### Later, only if users ask

- Optional hosted convenience features that fund the open-source project while
  preserving a complete free self-hosted product.
