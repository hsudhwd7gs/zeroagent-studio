---
description: Architecture overview, layer boundaries, and ground rules for Brainwire. Always loaded — base context for every Kilo session.
mode: all
---

# Brainwire Architecture (Base Rule)

Brainwire — static, browser-native multi-agent orchestrator on GitHub Pages.

## Non-negotiable architecture

| Rule | Detail |
|------|--------|
| No backend | No Express, DB servers, API routes, env secrets in repo |
| Static SPA | `vite.config.ts` `base: './'`; hash routes `#/` / `#/guide` via `src/lib/appRoute.ts`; Pages deploy via `.github/workflows/deploy.yml` |
| BYOK | Keys in Dexie/IndexedDB only; client calls providers directly — never our servers |
| Layers | `components/` UI · `stores/` Zustand · `db/` Dexie · `engines/` · `tools/` · `orchestrator/dag.ts` · `lib/brainResolver.ts` |

## Layer boundaries

| Layer | Location |
| ----- | -------- |
| Tools (palette, ports, run) | `src/tools/registry.ts` + manifests — **do not** hardcode in `dag.ts` or palette |
| AI providers | `src/engines/` + `src/lib/brainResolver.ts` |
| Canvas / UI shells | `src/components/` — many excluded from coverage; test logic in `src/lib` |
| Workflows | `src/stores/workflowStore.ts`, `src/lib/workflowIo.ts` |
| **Catalog counts** | `src/lib/siteStats.ts` — never hardcode tool totals in copy |

## Source layout

```
src/
  components/     UI — canvas, nodes, guide, settings, tutorial
  stores/         Zustand (workflow, settings, execution, confirm, …)
  db/             Dexie schema for saved workflows
  engines/        AI backends (OpenRouter, Groq, Gemini, local)
  tools/          Registry, manifests, runners, curated modules
  lib/            Ports, I/O, guards, key storage, tutorial quests
  orchestrator/   DAG execution
```

## Security (mandatory)

- API keys: session storage default; never in exports or URLs.
- Custom Script: no network; warn users not to paste secrets.
- **Docs must match code** — if behavior changes (privacy UI, locked tools, export redaction), update README, Guide, SECURITY, and TOOL-SAFETY in the same PR.
- We are a **trusted educator**, not a token funnel: no analytics, no backend that sees user data, honest cloud caveats.

Full model: `docs/SECURITY.md`. Privacy copy source: `src/lib/cloudPrivacy.ts`.

## Before you change code

1. Read `docs/CONTRIBUTING.md` and `docs/ARCHITECTURE.md`.
2. Run `npm run ci` before proposing a merge — it is the same gate as GitHub Actions.
3. Prefer the smallest correct diff. Match existing patterns in the file you edit.

## Do not commit

- Ephemeral plan files under `.cursor/plans/`, `.kilo/plans/`, `.claude/plans/` — see `.gitignore`.
- Secrets, API keys, or credentials. API keys belong in the browser Settings panel only.

## Companion rule files

| Rule | Purpose |
|------|---------|
| `01-architecture.md` (this file) | Base rule — always on |
| `02-engineer.md` | Implement features, fix bugs |
| `03-planner.md` | Design & trade-offs (no code) |
| `04-reviewer.md` | PR review & quality |
| `05-debugger.md` | Root-cause analysis |
| `06-test-engineer.md` | Vitest + 100% coverage |
| `07-security-auditor.md` | Threat-model review |
| `08-advisor.md` | Read-only Q&A |
| `09-pre-commit-quality-gate.md` | `npm run ci` before merge |
| `10-release-versioning.md` | SemVer + CHANGELOG |
