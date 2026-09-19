---
description: End-to-end patch workflow — implement, test, review, version, commit.
agent: code
---

End-to-end patch workflow for Brainwire. Follow these steps in order.

## Steps

1. **Branch** — from `main`; one concern per branch.
2. **Implement** — apply `.kilo/rules/02-engineer.md`; minimal diff; no backend.
3. **Test** — `npm ci` + `npm run ci` (gate must be green).
4. **Review** (optional) — run `/review-before-merge`.
5. **Document** — user-visible → `CHANGELOG.md` + `#/guide` if behavior changed.
6. **Version** — apply `.kilo/skills/release-versioning/SKILL.md` when shipping.
7. **Commit** — only after green gate and user request.
8. **Deploy** — push to `main` (GitHub Actions) or `npm run deploy` when user asks.

## Final reply (token-efficient)

Execution plan with `[x]` · files touched · gate result · version bump (if any).

Do NOT add server deps or store API keys outside `src/lib/keyStorage.ts` / Settings panel.
