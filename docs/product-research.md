# Product research: configurable planning poker

Research date: August 19, 2026

## What established tools teach users to expect

| Pattern | Evidence | Product decision |
| --- | --- | --- |
| Multiple and custom decks | [Parabol](https://www.parabol.co/templates/agile-estimation/custom-scales/) supports reusable custom scales; [Planning Poker](https://www.planningpoker.com/answer/using-the-deck-builder/) has a deck builder; [Miro](https://help.miro.com/hc/en-us/articles/5651786248210-Estimation-app) offers Fibonacci and T-shirt estimation. | Offer native Linear, Linear, Fibonacci, powers-of-two, and custom numeric decks. Snapshot the deck per session. |
| Automatic reveal and facilitator overrides | Planning Poker tools emphasize simultaneous private voting, timers, reveal, and revotes. [PlanningPoker.com](https://www.planningpoker.com/) explicitly markets customizable scoring and timers. | Keep private replaceable votes, early reveal, and revote; make reveal-when-ready configurable. |
| Backlog-tool import | [Miro](https://miro.com/agile/planning-poker/) imports Jira cards, while [Planning Poker Online](https://planningpokeronline.com/) advertises a native Linear integration. | Make Linear the system of record and support batch intake plus individual search. |
| Reordering and reusable rooms | [Team O'clock](https://www.teamoclock.com/help/the-planning-poker-meeting) documents draft meetings, task filtering, reordering, revoting, and stable team URLs. | Preserve persistent session URLs, draft preparation, manual drag order, and reusable filter/sort defaults. |
| Linear import and write-back are established | [PlanningPoker.live](https://planningpoker.live/integrations/linear), [Parabol](https://www.parabol.co/integrations/linear/), and [Spades](https://spades.poker/) all describe pulling Linear issues into a room and writing estimates back. | Do not claim the integration itself is unique. Differentiate on being open source, Linear-only, and intentionally smaller than a full meeting suite. |
| Coding agents can remove self-hosting friction | Linear teams are likely to already use developer tools, while OAuth and environment setup remain unfamiliar to many first-time self-hosters. | Lead with a safe prompt for Codex, Claude Code, Cursor, or another coding agent; keep concise manual instructions as the fallback. |

## Linear-native constraints and opportunities

Linear configures estimates per team and supports Linear, Fibonacci,
exponential, and T-shirt scales, optional zero, and two extended values. The app
therefore validates every custom card against the selected team's accepted
estimate values instead of silently converting a vote. See [Linear's estimate
documentation](https://linear.app/docs/estimates).

Linear supports filters for status, assignee, project, labels, cycles, and more,
plus manual, priority, created, updated, and other ordering modes. The first
productized intake pass exposes the filters most useful during refinement:
cycle, workflow category, estimate state, and assignee. See [Linear filters](https://linear.app/docs/filters),
[API filtering](https://linear.app/developers/filtering), and [display ordering](https://linear.app/docs/display-options).

For an open-source deployment, Linear's public OAuth distribution and
workspace-agnostic pre-filled OAuth manifest are the cleanest setup path. There
is no need for an application-level workspace allowlist. See [OAuth 2.0](https://linear.app/developers/oauth-2-0-authentication)
and [OAuth application manifests](https://linear.app/developers/oauth-app-manifests).

## Implemented product decisions

- Personal defaults page for deck, reveal, ticket intake, and agenda order.
- Any estimate-enabled Linear team and any authorizing Linear workspace.
- Public, pre-filled OAuth app setup link for self-hosters.
- Active/upcoming/any-cycle intake; Backlog/Todo/In Progress; estimated,
  unestimated, or any; anyone/me/unassigned.
- Import from existing Linear custom views so teams can reuse the filters they
  already maintain in Linear.
- Linear manual order plus priority, age, recency, identifier, title, custom
  multi-rule sorts, and final drag order.
- Session-level snapshots so preference changes do not mutate active rooms.
- The issue preview renders Linear content rather than adding a separate
  readiness model or duplicate issue fields.
- One decision path: write the estimate to Linear and continue. The only
  secondary action is to skip the ticket.
- Facilitators may vote or remain neutral, and tied votes never fabricate a
  recommendation.
- A visible round timer, pause/resume, and a copyable end-of-session summary.
- Agent-first self-hosting instructions with a novice-friendly manual option.

## Sensible next bets

- Named settings profiles for product managers who run ceremonies for multiple
  teams with different workflows.
- Project, label, and explicit workflow-state filters when teams need more
  granularity than the three workflow categories.
- Anonymous meeting-flow insights only after real users show that they improve
  the core pointing workflow without adding ceremony.
