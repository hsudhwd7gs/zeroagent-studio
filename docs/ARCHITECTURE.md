# Architecture

How Brainwire is built, why it is built this way, and where to extend it.
For end users, start with the in-app **Guide** or [README](../README.md).

---

## Core principle: browser-first, zero backend

There is **no Brainwire server**. Workflows, settings, and saved graphs live in
the browser (IndexedDB + optional session/local storage for API keys). When you
use cloud AI, the browser talks **directly** to OpenRouter, Groq, or Google.

Why:

- **free hosting** — static files on GitHub Pages.
- **Privacy by default** — files from File Reader never leave the device unless
  you wire them into a cloud step yourself. No analytics SDK; no Brainwire backend.
- **Forkability** — clone, `npm run build`, deploy `dist/`.
- **Auditability** — TypeScript throughout; 100% test coverage on core logic.

Trade-off: anyone can fork and modify behavior. We document threats in
[SECURITY.md](SECURITY.md) and review PRs carefully — we do not rely on
obscurity.

---

## Stack

| Layer | Technology |
| ----- | ---------- |
| UI | React 19, Framer Motion |
| Canvas | React Flow (`@xyflow/react`) |
| State | Zustand |
| Persistence | Dexie (IndexedDB) |
| Build | Vite 8, TypeScript 6 |
| Local AI | Transformers.js, WebLLM |
| Cloud AI | OpenRouter, Groq, Gemini (user keys) |
| Tests | Vitest + jsdom, 100% coverage gate |

---

## Runtime flow

```
User sends message in Chat (optional) or clicks Run on an Agent
        ↓
Orchestrator resolves execution scope (upstream feeders + downstream post-agent chains per sink agent)
        ↓
Each node: Agent (LLM) or Tool (registry run function) in topological order
        ↓
Agent receives labeled context blocks (user message + tool outputs as structured JSON)
        ↓
Post-agent tools run on Agent Out (transform, TTS, …)
        ↓
Final reply in Chat = Agent text (TTS is a side effect); tool-only runs return last step output
```

**Typed ports** (`src/lib/ports.ts`, `connectionValidation.ts`) block invalid
wires at connect time and highlight compatible handles while dragging.

---

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

**Single source of truth for tools:** `src/tools/registry.ts` + manifests.
Palette, inspector, ports, and execution all read from the registry.

---

## Routing

Hash routes via `src/lib/appRoute.ts`:

| Hash | View |
| ---- | ---- |
| `#/` | Studio (canvas) |
| `#/guide` | In-app manual |

`public/404.html` supports GitHub Pages SPA redirects when needed.

---

## Import / export

`.brainwire.json` (v1) — portable workflow backup. API keys are **never**
included. Import confirms before replacing the canvas (`workflowGuard.ts`).

---

## CI / deploy

- **CI** — `npm run ci` on every PR and push to `main`.
- **Deploy** — build `dist/`, publish via GitHub Actions Pages (see
  [DEPLOYMENT.md](DEPLOYMENT.md)).
- **CodeQL** — weekly `javascript-typescript` scan (`github/codeql-action@v4`).
- **Dependency review** — flags risky lockfile changes on pull requests.

Details: [CI-AND-AUTOMATION.md](CI-AND-AUTOMATION.md).

---

## Extension points

| Goal | Where |
| ---- | ----- |
| New transform tool | `manifests/index.ts` + `engines/*Runner.ts` |
| New cloud / browser tool | `src/tools/<name>.ts` + `registry.ts` |
| New AI provider | `src/engines/` + `brainResolver.ts` |
| New quest | `tutorialQuests.ts` + `tutorialValidators.ts` |
| Connection rules | `connectionValidation.ts` |
| Canvas lock (move/resize/wires) | `nodeCanvasLock.ts` + `workflowStore.ts` |
| Catalog counts in copy | `src/lib/siteStats.ts` (tests enforce totals) |

Do not bypass the registry — it keeps palette, inspector, and DAG in sync.
