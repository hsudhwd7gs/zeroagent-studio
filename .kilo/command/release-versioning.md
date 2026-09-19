---
description: Cut a Brainwire release — SemVer bump, CHANGELOG, CI, deploy.
agent: code
---

Cut a Brainwire release.

## Steps

1. Decide bump level (Major / Minor / Patch / None) per `.kilo/rules/10-release-versioning.md`.
2. Update `CHANGELOG.md` (Keep a Changelog format) with rationale.
3. Update `#/guide` / `README.md` if user-facing behavior changed.
4. Bump `package.json` version.
5. `npm ci` + `npm run ci` (gate must be green).
6. Push to `main` when user requests (triggers Pages deploy).
7. Fallback: `npm run deploy` (gh-pages CLI).

## Constraints

- Version authority: `package.json`
- Live URL: `https://brainwire.app/`
- Tool counts in copy: `src/lib/siteStats.ts` (never hardcode)
