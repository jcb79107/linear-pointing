# Isolated recovery drill — September 30, 2026

The existing personal GitHub sign-in successfully authenticated to Neon. The production database was not modified.

- Project: `public-linear-pointing-db` / `icy-resonance-36203339`
- Source: `main` / `br-long-firefly-awsqwv3e`
- Historical point: September 30, 2026, 08:40 America/Chicago (13:40 UTC)
- Isolated branch: `launch-restore-drill-2026-09-30` / `br-holy-violet-awld08om`
- Created: 09:41 CDT; read-only verification completed at 09:42 CDT.
- Automatic expiry: October 1, 2026, 09:41 CDT.
- Configured history retention: **6 hours**, on the current Free plan. This is a short recovery window; incidents discovered later may fall outside it. No paid plan change was made.

## Results

The branch was created from the historical data-and-schema option. A read-only SQL query returned:

| Check | Result |
| --- | ---: |
| Migration ledger rows | 8 |
| Users | 1 |
| Sessions | 0 |
| Queue tickets | 0 |
| Shared team defaults | 0 |
| Sessions without an owner | 0 |
| Queue tickets without a session | 0 |
| Unvalidated foreign keys | 0 |

This proves historical branch creation and queryable recovery of the current schema/account data. There is no real session history to validate yet. It does not prove an application cutover, provider-token decryption, restoration of populated voting history, or a recovery-time SLA. Repeat with disposable session fixtures once the live pilot is established.

Do not point production at this expiring branch. For an incident, inspect the target timestamp first, reconcile subsequent account deletions, and use the documented recovery procedure. Root-branch instant restore overwrites the selected timeline; this drill used a separate historical child branch instead.

Official reference: https://neon.com/docs/introduction/branch-restore
