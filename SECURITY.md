# Security

Security fixes target the current production release and `main`.

Use [GitHub private vulnerability reporting](https://github.com/jcb79107/linear-pointing/security/advisories/new). Do not report vulnerabilities in public issues. Include reproducible steps, affected routes/version, and the impact; redact credentials and private ticket data. Test only your own accounts and authorized disposable data. There is no guaranteed response time or paid bounty.

Pointed uses server-side authorization, encrypted provider credentials, hashed session tokens, same-origin checks, and hidden votes until reveal. These controls are tested but are not a claim of independent security certification. See [data handling](https://public-linear-pointing.vercel.app/privacy).

Deployment operators must keep the token encryption key stable and backed up securely, use an isolated database per environment, retain a recoverable production revision, and verify their database restore window. Never restore over production to test recovery; restore to an isolated branch first.
