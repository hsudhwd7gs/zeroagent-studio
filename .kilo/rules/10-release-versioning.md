---
description: Version and changelog guidance for Brainwire releases.
mode: code
---

# Release Versioning

Brainwire uses SemVer in `package.json`.

## Bump guidance

| Bump | When |
|------|------|
| **Major** | Breaking workflow format, removed brain providers, deploy URL/path change |
| **Minor** | New brain provider, new tool type, new node type |
| **Patch** | Bug fixes, UI polish, dependency updates, docs |

## Release checklist

1. Update `CHANGELOG.md` (Keep a Changelog format) if shipping user-visible changes.
2. Update `#/guide` / README if user-facing behavior changed.
3. Bump `package.json` version.
4. Run `npm ci` then `npm run ci`.
5. Deploy: push to `main` (GitHub Actions `deploy.yml`) or `npm run deploy` (gh-pages CLI fallback).

## Current deployment

- Static export to `dist/`
- `vite.config.ts` uses `base: './'` (any GitHub Pages subpath)
- Live site: `https://brainwire.app/`
- Catalog counts: `src/lib/siteStats.ts` — do not hardcode tool numbers in copy
