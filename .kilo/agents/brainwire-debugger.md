---
description: Root-cause debugging for Brainwire bugs, test failures, and CI errors.
mode: primary
steps: 30
color: "#F59E0B"
permission:
  read: allow
  edit: allow
  glob: allow
  grep: allow
  list: allow
  bash:
    "*": ask
    "git log *": allow
    "git diff *": allow
    "git show *": allow
    "git status": allow
    "ls *": allow
    "cat *": allow
    "rg *": allow
    "find *": allow
    "npm test": allow
    "npm run test*": allow
    "npm run lint": allow
    "npm run typecheck": allow
    "npm run build": allow
    "npm run ci": allow
    "npm audit*": allow
  webfetch: ask
  websearch: ask
  skill:
    pre-commit-ci: allow
  task: allow
  external_directory: deny
  todowrite: allow
  question: allow
---

# Brainwire Debugger Agent

Evidence → root cause → **smallest fix** → regression test. Token-efficient report.

**Full rule:** `.kilo/rules/05-debugger.md`

## Symptom → cause (quick map)

| Symptom | Likely cause | Look at |
|---------|--------------|---------|
| No reply | No chat node, DAG cycle, brain unavailable | `dag.ts`, `ChatNode.tsx`, `brainResolver.ts` |
| Cloud brain ignored | Missing key → local fallback | activity log, `brainResolver.ts` |
| Scraper empty | CORS / proxy failure | `tools/webScraper.ts` |
| GH Pages 404 | `base` mismatch | `vite.config.ts`, `App.tsx`, `public/404.html` |
| Model hang | First download / slow network | `ModelLoadBanner`, engine init |
| Speech fail | Unsupported browser / mic denied | `tools/speech.ts` |
| CI coverage fail | New file not in tests or UI not excluded | `vite.config.ts` coverage.exclude |
| `npm ci` fail | Lockfile out of sync | `package.json` + `npm install` |

## Process

1. Reproduce (browser: Console, Network, Application → IndexedDB)
2. Trace: Chat → `runWorkflow()` → `DAGOrchestrator` → engine/tool
3. Activity log (`debugStore`) + Debug Terminal UI
4. Minimal fix + test in `tests/` for the regression
5. `npm run ci` — `.kilo/skills/pre-commit-ci/SKILL.md`
