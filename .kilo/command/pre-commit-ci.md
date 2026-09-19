---
description: Run Brainwire quality gate (audit, lint, typecheck, coverage, build).
agent: code
---

Run the Brainwire quality gate and report results token-efficiently.

## Steps

1. `npm ci` — exact lockfile install.
2. `npm run ci` — full gate (audit → lint → typecheck → test:coverage 100% → build).
3. If anything fails, fix it and re-run until exit 0.
4. Final reply: command + pass/fail per step + files touched.

Do NOT commit on red. Reference: `.kilo/skills/pre-commit-ci/SKILL.md` and `.kilo/rules/09-pre-commit-quality-gate.md`.
