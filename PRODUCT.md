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
6. **Self-hosting stays boring.** Linear OAuth and Postgres are the only
   required services. Realtime infrastructure is optional.

## Core workflow

1. Sign in with Linear and select a team.
2. Import an upcoming cycle, active cycle, all matching tickets, or a saved
   Linear custom view.
3. Reorder the agenda and share the room.
4. Check readiness, discuss, vote privately, and reveal together.
5. Mark the issue Ready with an estimate, Needs details, Split, or Parked.
6. Copy the session summary, resume unfinished work later, and keep the durable
   decision in Linear.

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
- Keep public setup documented and deployment reproducible.

### Next

- Add facilitator keyboard shortcuts and stronger focus management.
- Let teams save a small number of reusable grooming profiles when one set of
  personal defaults is no longer enough.
- Add lightweight decision-history insights only when they help improve ticket
  readiness or meeting quality.

### Later, only if users ask

- Optional hosted convenience features that fund the open-source project while
  preserving a complete free self-hosted product.
