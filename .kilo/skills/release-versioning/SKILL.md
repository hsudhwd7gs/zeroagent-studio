---
name: release-versioning
description: Cut a Brainwire release — SemVer bump, CHANGELOG, CI, deploy. Use when shipping user-visible changes.
---

# Release Versioning

## Authority

- Version: `package.json`
- Changelog: `CHANGELOG.md` (Keep a Changelog)
- Deploy: push to `main` → `.github/workflows/deploy.yml` (GitHub Pages)
- Fallback: `npm run deploy` (gh-pages CLI)
- Live URL: `https://brainwire.app/`
- Tool counts in copy: `src/lib/siteStats.ts` (never hardcode)

## Bump decision

| Level | When |
|-------|------|
| **None** | Internal rules/skills only; user deferred release |
| **Patch** | Bug fixes, copy, deps, test-only |
| **Minor** | New brain, tool, node type, major Guide feature |
| **Major** | Breaking workflow format; removed provider; deploy path change |

## Workflow

1. State bump + rationale (one line)
2. `CHANGELOG.md` — `[Unreleased]` or new version section
3. Bump `package.json`
4. `npm ci` + `npm run ci`
5. Push to `main` when user requests (triggers Pages deploy)

## Rule reference

`.kilo/rules/10-release-versioning.md`
