# Changelog

All notable changes to Brainwire are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-25

First public open-source release of Brainwire.

### Added

- **Visual workflow studio** — Chat, Agent, and **203 chainable tools** on a React Flow canvas with typed ports and animated edges.
- **Tool registry** — 16 curated modules + 187 manifest presets across 15 engine runners (Text, Encoding, Hash, JSON, Lists, Math, Date, Validate, Flow, Regex, Generate, HTML, Markdown, CSV, Compare).
- **Eight guided quests** — Late-Night Snack Investigator, Data Pipeline Apprentice, Encoding Chain, Parallel Context, Writer's Room, URL Detective, Voice Booth, and Capture Desk with saved progress.
- **Example workflows** — parallel context, serial chains, tool-only flows, research stack, scraper cleanup, capture-only, and script laboratory; topology-based auto-layout with `fitWorkflowView` on load.
- **Text Output** tool — capture block in Browser **Output** subgroup; timestamped history, **Run capture** sink trigger, and **Capture only** example workflow.
- **Privacy & keys** — unified data inventory, per-category clear, API key management, replayable startup notices, and storage retention legend.
- **Launch onboarding** — title splash on every visit, first-visit privacy notice, and agent setup advice (WebLLM warning + free API key links).
- **Canvas lock** — lock icon on selected blocks prevents move, resize, delete, and wire changes until unlocked; persisted in saved workflows.
- **Curated tools** — Parse URL, Fetch JSON, File Reader, Web Scraper, Speech, JSON Tool, and related browser essentials.
- **AI engines** — OpenRouter (recommended), Transformers.js, WebLLM, Groq, and Gemini with auto-rotation on limits; shared `brainChoiceGuidance` for honest OpenRouter-first copy.
- **Intelligent setup** — cloud engines, models, and palette tools stay visible but **locked** until configured; inspector **Setup required** banners with **Privacy & keys**.
- **Import / export** — `.brainwire.json` workflows with discard guards on destructive actions.
- **API key storage** — session storage default (AES-GCM encrypted vault); opt-in persistent storage on device via IndexedDB.
- **In-app Guide** — full manual at `#/guide`, including privacy, optional crypto support addresses, and staying-safe sections.
- **Game-style palette** — legendary Chat/Agent glow, color-coded sub-groups, pulsing Quests menu.
- **Tool safety layer** — per-tool inspector notices, [`docs/TOOL-SAFETY.md`](docs/TOOL-SAFETY.md), and plain-language scraping ethics.
- **CI/CD** — GitHub Actions (CI, Deploy, CodeQL, Release on tag), Dependabot (npm + Actions), PR dependency review, issue templates, `FUNDING.yml`.
- **Documentation** — `docs/` (architecture, security, deployment, release checklist, contributing).
- **Live catalog stats** — `src/lib/siteStats.ts` derives tool counts for Guide and README.
- **Publication polish** — README badges, `robots.txt` / `sitemap.xml`, `package.json` keywords, release-on-tag workflow.

### Changed

- **Canvas UX** — hint bar moved to the top-right; zoom controls stay at bottom-left so controls are not covered.
- **Canvas node chrome** — chat send button stretches to the full textarea height (centered in the row); **Run workflow** / **Run capture** and lock/delete toolbar buttons share 28px height and 6px border radius.
- **Text Output UX** — Run capture disabled until upstream is wired; canvas shows latest capture snippet; sink trigger validates Text Output tool type.
- **Sink scope** — Run capture runs tool-only upstream chains (excludes Chat/Agent).
- **Launch splash** — dedicated overlay styling; empty state and hint bar hidden during onboarding sequence.
- **CI & security automation** — CodeQL Action v4 (`javascript-typescript`), shared `.github/actions/setup-node`, `ubuntu-24.04` runners, Pages deploy `@v5`.

### Fixed

- **Post-agent tool chains** — `Agent Out → Tool → …` (encode, Speech TTS, Text Output, etc.) runs after the Agent; agent text reaches Speech in parallel fan-out or serial chains (including `Agent → Text Output → Speech`).
- **Speech TTS wiring** — whitespace-only port maps no longer block legacy agent output; TTS/both modes skip cleanly when **In** is unwired instead of throwing.
- **Chat reply with TTS** — assistant message shows Agent text; Speech plays in the background without replacing the reply.
- **Resizable nodes** — port handles, toolbar, and wires work again after resize.
- **Guided quests** — tutorial steps scroll palette and canvas targets into view (including collapsed accordion sections).

### Security

- **SSRF protection** — Web Scraper validates URLs; blocks local/private hosts, strict Wikipedia hostname checks, and common rebinding patterns.
- **Session API keys** — AES-GCM encrypted vault in `sessionStorage` (legacy plain JSON migrated on read).
- **Safe HTML decode** — encoding tool decodes entities without `innerHTML`.
- **Export redaction** — API-key-like strings redacted in `.brainwire.json` exports.
- **Custom Script sandbox** — blocks `fetch`, `import()`, `importScripts`, and nested Workers.
- **Gemini keys** — sent via `x-goog-api-key` header, not URL query strings.
- **Canvas lock badges** — agents and tools show 🔒 when not configured.
- Production builds ship without source maps.

### Tests

- 1036 tests, 100% statement/branch/function/line coverage on enforced `src/` paths.
