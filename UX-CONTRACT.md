# Pointed interaction contract

- Select/Listbox: native HTML selects own keyboard, mobile picker, and popup behavior. Labels are explicit. TeamDefaultFields owns the four reusable workflow inputs.
- Forms: application validation uses Zod on the server and explicit client feedback. Busy controls prevent repeat submissions. Errors preserve input and use role=alert.
- Feedback: inline role=status for save/order feedback; errors use role=alert. Saved-to-Linear feedback is shown only after confirmed server success.
- Dialogs: ConfirmDialog owns focus trapping, Escape, return focus, cancel, and destructive confirmation. Estimate conflict confirmation uses its primary variant.
- Reordering: DndKit pointer and keyboard sensors plus Move up/down buttons. Server validates the complete queue membership before saving.
- Theme and typography: DESIGN.md maps to src/app/globals.css tokens. Native select geometry is intentionally platform-owned. Appearance is personal and automatically saved; team defaults require explicit save.
- Intake: current/next/+2/+3/no-cycle is a shared team default, scoped by workspace and Linear team. All unestimated non-completed/non-canceled prepared issues are loaded. A draft pins the resolved cycle ID and dates; refresh does not advance it. Changing source requires an explicit load. Reload replaces the draft only after successful reads and confirmation.
- Agenda: reordering/removal affects only Pointed. Reading another ticket never advances the shared session or permits a vote on the wrong ticket. Mobile retains agenda access and individual revealed votes.
- Settings: any accessible Linear team member can edit shared defaults. Existing sessions keep their copied defaults. Explicit unsaved state and leave confirmation protect edits. Appearance remains per-device.
- Tests: tests/e2e covers isolated browser contexts; tests/ui-fixture.mjs renders real components with synthetic data without credentials. PostgreSQL tests use disposable PGlite. Live OAuth, external writes, and multi-user network behavior require a separate authorized integration smoke test.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native HTML select; TeamDefaultFields for workflow choices | TeamDefaults schema and DESIGN.md | team defaults, session override, agenda navigation | cycle-preview browser tests and manual popup inspection |
| Form | Component form handlers plus server Zod schemas | API contracts | create, edit | persistence tests and failure-path browser tests |
