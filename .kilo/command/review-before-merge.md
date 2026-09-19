---
description: Pre-merge review for Brainwire — CI, architecture, security. Findings only.
agent: brainwire-reviewer
---

Pre-merge review for Brainwire. **Findings only** unless user asks to fix.

## Order

1. **CI** — confirm `npm run ci` is green (`.kilo/skills/pre-commit-ci/SKILL.md`).
2. **Architecture** — static-only; layers intact; Prometheus fallback preserved.
3. **Security** (keys, scraper, speech, fetch, deps) — apply `.kilo/rules/07-security-auditor.md`.

## Brainwire checklist

- [ ] Brains: engine + `BrainType` + Settings + inspector + tests + `brainLabels`
- [ ] Tools: registry (`src/tools/registry.ts`) + tests — no hardcoded palette entries
- [ ] Keys via `keyStorage.ts` (session default); no hardcoded secrets
- [ ] `base: './'` in `vite.config.ts` unchanged or documented
- [ ] Heavy engines lazy-loaded
- [ ] Guide/README if user-facing behavior changed
- [ ] Coverage 100% on new logic

## Output format

| Severity | Location (file:line) | Finding |

Sort highest severity first. After review: blockers → fix → re-run CI. Clean → commit/PR per user request.
