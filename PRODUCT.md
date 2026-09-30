# Product direction

Pointed is a focused pointing room for teams that already prepare their work in Linear.
Everyone reads tickets on their own screen, votes independently, discusses differences,
and agrees an estimate that the facilitator saves to Linear.

## Values

- Linear is the source of truth for requirements, cycles, and estimate scales.
- Tickets arrive ready to estimate; splitting and clarifying work happen beforehand.
- Private votes protect independent judgment. An average is a suggestion, not consensus.
- The facilitator keeps the session moving; participants control their own reading.
- Defaults remove repetitive setup. Essential workflows work on phones and keyboards.
- Explicit save feedback, recoverable errors, and clear remaining work earn trust.

## Workflow

1. Prepare unestimated tickets in Linear and set their manual order.
2. Create a session for a Linear team. Its shared defaults select current cycle,
   next cycle (default), two or three cycles ahead, or backlog/no cycle.
3. Load the agenda. Pointed resolves and pins the actual cycle, imports all
   unestimated issues except completed/canceled work, and uses Linear's manual
   sortOrder, priority, or oldest-first order. Zero is an estimate, not missing data.
4. Review the preview, reorder or remove tickets, and share the session link.
   Reordering/removal affects Pointed only. Reloading explicitly replaces this preview.
5. Read independently and vote privately. Participants can browse other agenda
   tickets and return to the current one; previewing disables voting on the wrong issue.
6. Reveal automatically when everyone has voted, or let the facilitator reveal.
   Facilitators can optionally vote. Discuss the individual votes and spread, choose
   the final estimate, and save to Linear before advancing.
7. Finish with estimated, skipped, and remaining counts. Resume unfinished work or
   revisit a skipped ticket directly from the summary.

## Defaults and ownership

The four shared team defaults are relative cycle, starting order, reveal behavior,
and facilitator voting. Any user with access to that Linear team can edit them.
Defaults are keyed by Linear organization and team. New sessions copy them; existing
sessions keep their own choices and pinned cycle. Appearance stays personal/device-local.
Linear's estimate scale is used automatically; there is no separate Pointed deck setting.

## Non-goals

Replacing Linear's issue management, configurable intake query builders, requirements
writing, AI estimates, automatic saving, Jira/GitHub integrations, or billing.

## Pilot verification

Exercise invite, join, vote, reveal, save, refresh/rejoin, finish, and resume with two
real users before opening the pilot. Include failed saves and wrong-workspace access.
Synthetic fixtures and local tests do not substitute for those live integration checks.
