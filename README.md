# Brainwire

[![CI](https://github.com/sakurablush/brainwire/actions/workflows/ci.yml/badge.svg)](https://github.com/sakurablush/brainwire/actions/workflows/ci.yml)
[![Deploy](https://github.com/sakurablush/brainwire/actions/workflows/deploy.yml/badge.svg)](https://github.com/sakurablush/brainwire/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/sakurablush/brainwire/actions/workflows/codeql.yml/badge.svg)](https://github.com/sakurablush/brainwire/actions/workflows/codeql.yml)
[![license](https://img.shields.io/github/license/sakurablush/brainwire)](./LICENSE)
[![version](https://img.shields.io/badge/version-0.1.0-8b5cf6?style=flat-square)](CHANGELOG.md)

[![Live app](https://img.shields.io/badge/🌐_open_live_app-06b6d4?style=flat-square)](https://sakurablush.github.io/brainwire/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=15161f)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![tests](https://img.shields.io/badge/tests-1036_%7C_100%25_cov-10b981?style=flat-square)](https://github.com/sakurablush/brainwire/actions/workflows/ci.yml)
[![telemetry](https://img.shields.io/badge/telemetry-none-8b5cf6?style=flat-square)](#privacy-in-plain-language)

**Draw AI agent workflows in your browser — like a flowchart, except the boxes can read your files, fetch a web page, listen to your voice, and think.**

Free **visual AI agent builder** for students, makers, and anyone who wants workflow automation without spinning up a server. **300+ chainable tools**, **eight guided quests**, local models that work **without an API key**, and optional cloud tiers (OpenRouter, Groq, Gemini) only when *you* paste the key.

No install · No subscription · No account · No analytics SDK

[Live app](https://sakurablush.github.io/brainwire/) · [In-app Guide](https://sakurablush.github.io/brainwire/#/guide) · [Report a bug](https://github.com/sakurablush/brainwire/issues/new/choose) · [Contributing](docs/CONTRIBUTING.md)

> **New here?** Open the [live app](https://sakurablush.github.io/brainwire/) and click **Guide** — or **Examples → Hello, Agent** and send your first message in about two minutes. Prefer learning by doing? Start **Snack Investigator** on the welcome screen.

**Canonical repo:** [github.com/sakurablush/brainwire](https://github.com/sakurablush/brainwire)

## Safe to use (and safe to fork)

We built this as a **static site** — no backend that sees your chats, keys, or files.

| What | How |
|------|-----|
| **API keys** | Stored in *your* browser only. Default: forgotten when you close the tab. Never sent to us. |
| **Custom Script** | Sandboxed Web Worker — no network, no `import`, no filesystem. |
| **Web Scraper** | Blocks localhost and private IPs (SSRF guard). You choose every URL. |
| **Export** | `.brainwire.json` redacts key-like strings in block config. Settings keys are never included. |
| **Supply chain** | `npm audit` (moderate+) in CI, Dependabot (npm + Actions), PR dependency review, weekly CodeQL on the repo. |
| **License** | MIT — fork, rename, host on your own Pages, give it away. |

Details for humans: [docs/SECURITY.md](docs/SECURITY.md) · risky tools: [docs/TOOL-SAFETY.md](docs/TOOL-SAFETY.md) · report issues: [SECURITY.md](SECURITY.md).

## Contents

- [Who is this for?](#who-is-this-for)
- [What you can do](#what-you-can-do)
- [Quick start](#quick-start-users)
- [Documentation](#documentation)
- [Privacy](#privacy-in-plain-language)
- [For developers](#for-developers)
- [Community & support](#community--support)
- [Keep building (optional)](#keep-building-optional)
- [License](#license)

---

## Who is this for?

- Students who want AI help but cannot pay for ChatGPT Plus or a new laptop  
- Makers experimenting with agents without spinning up a server  
- Anyone who cares about privacy and wants files to stay on their machine  
- Developers who want a static, hackable orchestrator they can host for free on GitHub Pages  

We built this with a simple rule: **the fire should be free.** Everything costs free to start. We recommend a free OpenRouter key for the best experience (fast, no local download); Transformers.js works without a key if you prefer local inference. We will never upsell you, sell your data, or run a backend that sees your chats. See [Privacy](#privacy-in-plain-language).

---

## What you can do

| You want to… | How |
|--------------|-----|
| Ask a question and get an answer | **Examples → Hello, Agent** → type in Chat → Enter |
| Summarize your homework file | Chat → **File Reader** → **Agent** |
| Read a web page and get a brief | Chat → **Web Scraper** → **Agent** |
| Speak instead of type | Chat → **Speech** → **Agent** |
| Chain two AI steps (draft → polish) | Chat → Agent → Agent |
| Transform agent output (encode, trim, speak) | Chat → **Agent** → **Binary Encode** / **Trim Text** / **Speech** (Agent **Out** → Tool **In**) |
| Capture results without Chat | **Web Scraper** → **HTML To Text** → **Text Output** — click **Run capture** in inspector |
| Transform or parse text | Chat → **Text Transform** or **JSON Tool** → **Agent** |
| Format dates or do quick math | Chat → **Date & Time** or **Calculator** → **Agent** |
| Copy/paste in a workflow step | Chat → **Clipboard** → **Agent** |
| Encode or hash text | Chat → **Base64 Encode** / **SHA-256** / … → **Agent** |
| Transcribe audio (Groq key) | Chat → **Groq Transcribe** → **Agent** |
| Ask about an image (Gemini key) | Chat → **Gemini Vision** → **Agent** |
| Compare text similarity (embeddings) | Chat → **Gemini** or **OpenRouter Embeddings** → **Agent** |
| Run your own logic (sandbox) | Chat → **Custom Script** → **Agent** |
| Learn web scraping step-by-step | Welcome **Snack** card or header **Quests** → Snack Investigator |
| Learn JSON + script chaining | Welcome **Pipeline** card or **Quests** → Pipeline Apprentice |
| Learn typed ports + encoding | Welcome **Encoding** card or **Quests** → Encoding Chain |
| Learn parallel context blocks | Welcome **Parallel** card or **Quests** → Parallel Context |
| Learn multi-agent chains | Header **Quests** → Writer's room |
| Learn URL parsing | Header **Quests** → URL detective |
| Learn post-agent TTS | Header **Quests** → Voice booth |
| Learn capture sinks (no chat) | Header **Quests** → Capture desk |

All palette items are **free** on-device or use your own free API keys. The left sidebar lists **300+ tools** (live count via `getSiteStats()` in the in-app **Guide**) — search at the top, then browse **Browser** sub-groups (**Output**, Essentials, Text, Encoding, JSON, Lists, Math, Date, Validate, Flow, Regex, Generate, HTML, Markdown, CSV, Compare), **Cloud** (API tools), and **Custom Script**.

### Guided quests (recommended order)

| Order | Quest | Flow | What you learn |
|-------|-------|------|----------------|
| 1 | **Snack** — Late-Night Snack Investigator | Chat → Web Scraper → Agent | First pipeline, web fetch, agent role |
| 2 | **Pipeline** — Data Pipeline Apprentice | Chat → JSON Tool → Custom Script → Agent | Typed ports lesson, JSON, sandbox script |
| 3 | **Encoding** — Encoding Chain | Chat → Base64 Encode → Base64 Decode → Agent | Manifest presets, text port chaining |
| 4 | **Parallel** — Parallel Context | Chat + Date & Time → Agent Context | Parallel context blocks, auto-run tools |
| 5 | **Writer's room** | Chat → Agent (writer) → Agent (editor) | Multi-agent **Out → Context** chains |
| 6 | **URL detective** | Chat → Parse URL → Agent | Structured JSON context from links |
| 7 | **Voice booth** | Chat → Agent → Speech (TTS) | Post-agent tool chain, browser text-to-speech |
| 8 | **Capture desk** | Date & Time + UUID → Agent → Text Output | No-chat workflow, capture sink, inspector run |

Replay anytime from the header **Quests** menu. Progress is saved per quest in your browser (no account).

**Example workflows** (header **Examples** menu — 22 ready-made flows in categories: Starter, Research, Pipelines, Data, Voice, and Power): featured picks include **Hello, Agent**, **Snack verdict**, and **Wiki to podcast**. Each loads a pre-wired canvas with optional try-prompts; cloud **Power** examples show a key badge when a free Groq or Gemini key is needed.

### Typed ports (quick reference)

| Block | Ports | Notes |
|-------|-------|-------|
| **Chat** | `Message` (text out) | Only sends — cannot be wired *to* |
| **Agent** | `Context` (text in, multiple OK), `Out` (text out) | Labeled context blocks — Chat message always included on send |
| **Tools** | From registry — usually `In` / `Out` | Types: text, json, number, embedding, … |

**Rules:** JSON output can feed text inputs. Text cannot feed strict JSON inputs — use **JSON Tool** (curated, accepts text) or a parse step first. Compatible ports highlight while dragging; mismatches log a warning and do not connect. Legacy saved workflows auto-migrate to default handles.

### Tool reference

The palette includes **curated modules** with rich inspector UIs (browser essentials, cloud APIs, Custom Script) plus **manifest presets** (Base64, Trim Text, SHA-256, Slugify, JSON Pretty, validators, etc.). Open the in-app **Guide** for live tool counts from `src/lib/siteStats.ts`. Use the sidebar **search** to find a tool by name.

| Group | API key | Examples |
|-------|---------|----------|
| Browser essentials | — | File Reader, Web Scraper, Speech, Text Transform, JSON Tool, Parse URL, Fetch JSON |
| Browser presets | — | Base64, Trim Text, JSON Pretty, SHA-256, HTML To Text, Regex, CSV, and 180+ more |
| Cloud | Groq / Gemini / OpenRouter | Transcribe, Vision, Embeddings |
| Custom | — | Custom Script (sandboxed Web Worker) |

See **Guide → Tools explained** in the app for per-tool details. Curated **JSON Tool** accepts text (paste JSON in Chat). Manifest **JSON Pretty** / **JSON Minify** require a JSON-typed upstream wire.

---

## Quick start (users)

1. Open the [live app](https://sakurablush.github.io/brainwire/) (or [local dev](http://localhost:5173/) after `npm run dev`).
2. **Recommended:** click **Privacy & keys** and paste a free [OpenRouter](https://openrouter.ai/keys) key (`sk-or-…`). Agents auto-rotate between free models when one hits a limit.
3. Click **Examples → Hello, Agent** — a Chat and Agent appear, already connected. Explore **300+ tools** in the left palette (280+ manifest presets + 20+ curated modules).
4. Type a question in the Chat box and press **Enter**.
5. Read the reply in Chat. For a guided tour, try the eight quests from the welcome banner or header **Quests** (Snack → Pipeline → Encoding → Parallel, then Writer's room, URL detective, Voice booth, Capture desk) — or open **Guide** for the full manual.

**First visit:** title splash → privacy notice → performance advice (WebLLM vs free API keys) → optional welcome banner.

**No key?** Transformers.js runs locally free but downloads a model on first use and can feel slow on weak hardware. WebLLM is a slow fallback — a free OpenRouter key is the best experience for most people.

**Optional:** Groq or Gemini keys also work with auto-rotation on rate limits. Keys stay in your browser; we never see them.

### Save, export, and import

| Action | Where | Notes |
|--------|-------|-------|
| **Save** | Header | Stores the canvas in browser storage (IndexedDB). |
| **Load** | Header → Load | Picks a saved workflow; confirms if you have unsaved canvas work. |
| **Export** | Header | Downloads `.brainwire.json` — portable backup or share. |
| **Import** | Header | Opens a file picker; validates format and confirms before replacing the canvas. |
| **New** | Header | Clears the canvas after confirmation when work exists. |
| **Canvas lock** | Selected block toolbar | Lock icon freezes move, resize, delete, and wire changes until unlocked; saved with workflows. |
| **Privacy & keys** | Header → Privacy & keys | Optional cloud keys and data controls. Default: forgotten when you close the browser. |

Starting an **Example**, a **Quest**, or **Import** also warns when it would discard your current flow.

### API key safety (plain language)

| Mode | Default? | What it means |
|------|----------|---------------|
| **Forget when I close the browser** | Yes | Keys stay in encrypted session storage for this tab — cleared when the session ends. Good for shared computers. |
| **Remember on this device** | Opt-in | Keys stay in browser storage until you clear site data. Fine on a laptop that is only yours. |

Keys are never sent to Brainwire — only directly to OpenRouter, Groq, or Google when you run a cloud step. Do not paste keys into Custom Script blocks (they can end up in saved/exported workflows).

---

## Documentation

| Document | Audience | Link |
| -------- | -------- | ---- |
| **In-app Guide** | Everyone | [#/guide](https://sakurablush.github.io/brainwire/#/guide) on the live site |
| **Architecture** | Contributors | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Deployment** | Host your own copy | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **Security** | Trust & keys | [docs/SECURITY.md](docs/SECURITY.md) |
| **Tool safety** | Risky tools (scraping, cloud, clipboard) | [docs/TOOL-SAFETY.md](docs/TOOL-SAFETY.md) |
| **CI & automation** | Maintainers | [docs/CI-AND-AUTOMATION.md](docs/CI-AND-AUTOMATION.md) |
| **Contributing** | PR authors | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| **Release checklist** | Maintainers | [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) |
| **Changelog** | Release history | [CHANGELOG.md](CHANGELOG.md) |

GitHub Actions: **CI** on every PR, **Deploy** to Pages on `main`, **CodeQL** + **Dependency review** on PRs, weekly security scans. No npm publish — this is a static app only.

---

## Privacy in plain language

- Your workflows are saved **inside your browser** — not on our servers. There is no account, no analytics SDK, and no telemetry endpoint in this app.
- **We never receive your chats, files, API keys, or prompts.** If you use cloud AI, your browser talks **directly** to that provider — we are not in the middle and cannot monetize your usage.
- **API keys** default to **session storage** (AES-GCM encrypted, forgotten when you close the browser). You can opt in to **Remember on this device** in **Privacy & keys**.
- **Export** downloads a `.brainwire.json` file you can back up or share — keys from Settings are **not** included (accidental keys in block config are redacted).
- **Web Scraper** only fetches URLs you choose — respect site rules; see [docs/TOOL-SAFETY.md](docs/TOOL-SAFETY.md). Third-party CORS helpers may see the URL you requested.
- **File Reader** never uploads your files to us — but if you wire it to a **cloud Agent**, file text goes to that provider under their terms.
- **Local AI** runs on your device after model weights download from public CDNs (Hugging Face, MLC). That download is not private cloud inference, but your prompts stay on-device for those steps.
- **Intelligent setup:** engines, models, and cloud tools you cannot run yet are **locked in the UI** with a plain explanation and a **Privacy & keys** button — not hidden, not bait-and-switch.

### Cloud APIs — configure privacy on their sites

Open **Privacy & keys** in the app → scroll to **Privacy & cloud providers**. That section is the honest checklist:

| Provider | What you should verify |
| -------- | ---------------------- |
| **OpenRouter** | [Privacy settings](https://openrouter.ai/settings/privacy) — training/routing toggles; [Observability](https://openrouter.ai/settings/observability) — keep prompt logging OFF unless you want it; [data-collection docs](https://openrouter.ai/docs/guides/privacy/data-collection). |
| **Groq** | [Legal & DPA](https://console.groq.com/docs/legal); [Privacy Policy](https://groq.com/privacy-policy/). Audio sent to Groq Transcribe is a cloud upload. |
| **Gemini** | [API Terms](https://ai.google.dev/gemini-api/terms) — **free / AI Studio keys are often “Unpaid Services”** where Google may use prompts to improve products; paid tiers differ. See [abuse monitoring & retention](https://ai.google.dev/gemini-api/docs/usage-policies) and [ZDR](https://ai.google.dev/gemini-api/docs/zdr). |

When your workflow includes a cloud Agent or cloud tool, the **Chat** block shows a warning before you send — your message and anything wired upstream (files, web pages, audio) may leave the browser.

Provider rules change. If our in-app text disagrees with their documentation, **trust their documentation**.

---

## For developers

### Run locally

```bash
git clone https://github.com/sakurablush/brainwire.git
cd brainwire
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/)

### Quality gate

```bash
npm ci          # exact install from lockfile (CI / clean machine)
npm run ci      # audit → lint → typecheck → test:coverage (100%) → build
```

Requires **0 npm audit vulnerabilities** (moderate+). Keep `package-lock.json` in sync with `package.json`.

### Deploy to GitHub Pages

**Recommended:** enable **Settings → Pages → GitHub Actions**, then push to `main`.
The [deploy workflow](.github/workflows/deploy.yml) publishes `dist/` automatically.

Manual fallback: `npm run deploy` (uses `gh-pages` CLI).

`vite.config.ts` uses `base: './'` so the bundle works on any GitHub Pages subpath.

### Project layout

```
src/
  components/   UI — canvas, nodes, guide, settings, tutorial overlay
  stores/       App state (Zustand)
  db/           Browser storage (IndexedDB via Dexie)
  engines/      AI backends — WebLLM, Transformers.js, OpenRouter, Groq, Gemini
  tools/        Tool registry (`registry.ts`) + manifest presets + runner engines
  lib/          Port types, node ports, connection validation, workflow migration,
                tutorial quests/validators, brain resolver
  orchestrator/ Workflow runner (executes your graph in order)
docs/           Maintainer documentation (architecture, security, deployment, CI)
.github/        Workflows — CI, Pages deploy, CodeQL, dependency review, Dependabot, issue templates
```

### Adding tools

- **Manifest preset** (preferred for transforms): row in `src/tools/manifests/index.ts` + engine in `src/tools/engines/*Runner.ts`
- **Curated module** (file picker, mic, fetch, cloud API): `src/tools/<name>.ts` + entry in `CURATED_TOOLS` inside `registry.ts`

See [`.cursor/skills/add-browser-tool/SKILL.md`](.cursor/skills/add-browser-tool/SKILL.md). Do not hardcode tools in `dag.ts` or `NodePalette.tsx` — the registry drives palette, ports, inspector, and execution.

### Tutorials & docs sync

When changing quests, tools, or ports, update together:

| Artifact | Path |
|----------|------|
| Quest steps & copy | `src/lib/quests/` (barrel: `src/lib/tutorialQuests.ts`) |
| Auto-advance validators | `src/lib/tutorialValidators.ts` |
| In-app manual | `src/components/guide/GuidePage.tsx` |
| Repo overview | `README.md` (this file) |
| Entry points | `WelcomeBanner.tsx`, `Header.tsx`, `App.tsx` |

### Tech stack

Vite · React · TypeScript · React Flow · Zustand · Dexie · WebLLM · Transformers.js · Framer Motion

### AI agent skills (Cursor, Kilo & more)

Two parallel sets of agent playbooks stay in sync — Cursor rules and
skills in [`.cursor/`](.cursor/), Kilo mirror in [`.kilo/`](.kilo/).

| Tool | Where to look |
|------|---------------|
| **Cursor** | Skills in [`.cursor/skills/`](.cursor/skills/); rules in [`.cursor/rules/`](.cursor/rules/). |
| **Kilo Code** | Central config [`.kilo/kilo.jsonc`](.kilo/kilo.jsonc); rules in [`.kilo/rules/`](.kilo/rules/); skills in [`.kilo/skills/`](.kilo/skills/); personas in [`.kilo/agents/`](.kilo/agents/); slash commands in [`.kilo/command/`](.kilo/command/). |
| **Other agents** | Read [AGENTS.md](AGENTS.md) — the single landing page for every coding assistant. |
| **All tools** | Ignore files in [`.cursorignore`](.cursorignore), [`.kilocodeignore`](.kilocodeignore), and [`.kilo/kilo.jsonc`](.kilo/kilo.jsonc) `permission.read/edit` keep secrets and ephemeral state out of context. |

---

## Community & support

| Resource | Link |
| -------- | ---- |
| **Bug reports** | [Issue templates](https://github.com/sakurablush/brainwire/issues/new/choose) |
| **Contributing** | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |
| **Contributors** | [CONTRIBUTORS.md](CONTRIBUTORS.md) |
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) |
| **Agent instructions** | [AGENTS.md](AGENTS.md) — for Cursor / Kilo / other coding assistants |
| **Code of Conduct** | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| **Security** | [SECURITY.md](SECURITY.md) |
| **Support the project** | [`.github/FUNDING.yml`](.github/FUNDING.yml) — crypto donation addresses |

Forks welcome. If you ship something cool, open a PR or tell us in [Discussions](https://github.com/sakurablush/brainwire/discussions).

**First time publishing this repo?** See [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md).

---

## Keep building (optional)

Brainwire is free to use — no paywall, no accounts, no ads. Building and maintaining it
takes real time and model tokens, from one self-funded stack.

**Contribute in code** if that fits you: fork the [public repo](https://github.com/sakurablush/brainwire),
open a pull request, or start a [Discussion](https://github.com/sakurablush/brainwire/discussions).
Run `npm run ci` locally before you push.

**Chip in financially** only if the app saved you time or money and you want to help cover the next
round of building — creation or upkeep. No tiers, no perks, no obligation:

| Coin     | Address                                       |
| -------- | --------------------------------------------- |
| Bitcoin  | `bc1qcrj9wreunffxm75fcz0a2gjkw87jshcwvmxv68`  |
| Ethereum | `0xB85Bf389E5fC5E12636FB6F17b68Df7fC990a3dA`  |
| Litecoin | `ltc1q0nsarncmnz8vk34dav7l0vgu9m5k48drr8z6js` |
| Dogecoin | `D6YGoYWpFZxW8JXvEfT5iB9uNXcs8AeY7L`          |

Explorer links: [`.github/FUNDING.yml`](.github/FUNDING.yml).

---

## License

MIT — see [LICENSE](LICENSE).

