---
name: review-before-merge
description: Pre-merge review for Brainwire — CI, architecture, security. Use before PR, release, or when user asks for merge review.
---

# Review Before Merge

Structured review. Fix blockers before commit. **Findings only** unless user asks to fix.

## Order

1. **CI** — `.kilo/skills/pre-commit-ci/SKILL.md` (must pass first)
2. **Architecture** — static-only; layers intact; Prometheus fallback preserved
3. **Security** (keys, scraper, speech, fetch, deps) — `.kilo/rules/07-security-auditor.md`

## Brainwire checklist

- [ ] Brains: engine + `BrainType` + Settings + inspector + tests + `brainLabels`
- [ ] Tools: registry (`src/tools/registry.ts`) + tests — no hardcoded palette entries
- [ ] Keys via `keyStorage.ts` (session default); no hardcoded secrets
- [ ] `base: './'` in `vite.config.ts` unchanged or documented
- [ ] Heavy engines lazy-loaded
- [ ] Guide/README if user-facing behavior changed
- [ ] Coverage 100% on new logic

## Bugbot-style summary format

| Severity | Location (file:line) | Finding |

Sort highest severity first.

## After review

Blockers → fix → re-run CI + review. Clean → commit/PR per user request.

**Rule:** `.kilo/rules/04-reviewer.md`
