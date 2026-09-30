# Contributing to Pointed

Pointed helps teams point prepared Linear issues while everyone reads on their own screen. Keep setup simple and preserve private voting and explicit facilitator confirmation.

Open an issue before a substantial feature. Use small, focused pull requests and explain the user problem. The [README](README.md) covers local setup. Use a disposable Linear workspace and issues for integration work; never include employer credentials or private tickets in fixtures, screenshots, logs, or commits.

Before a pull request:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
npx playwright install chromium webkit
npm run test:ui
```

Browser tests use synthetic data and fresh contexts. They never replace a real authenticated integration check. Use native controls, semantic labels, visible focus, and narrow-screen layouts. Test failure recovery as well as successful actions. Add migrations instead of changing existing migration history.

Do not upload `.env` files, database dumps, cookies, Playwright auth state, or provider tokens. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

Be respectful, specific, and welcoming. Harassment and disclosure of someone else’s private information are not acceptable. The maintainer may remove harmful content or restrict participation. Contributions use the repository’s MIT license.
