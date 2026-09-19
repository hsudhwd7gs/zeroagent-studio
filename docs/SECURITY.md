# Security

Brainwire’s security model, local data, and honest limitations.
For per-tool warnings see [TOOL-SAFETY.md](TOOL-SAFETY.md). For architecture context see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## What the app does

A static React app that runs AI **workflows** you draw on a canvas. Tools may:

- read local files (never uploaded by us),
- fetch URLs you specify (browser `fetch` and optional third-party CORS helpers),
- call cloud APIs with **your** API keys (browser → provider directly),
- run sandboxed JavaScript in a Web Worker (Custom Script — network blocked).

There is **no** Brainwire API, analytics endpoint, telemetry SDK, or account system.

We are **not** a token reseller: we do not proxy your traffic, bill you, or train on your data. Optional cloud keys are **yours** — pasted in your browser, sent only to the provider you chose. We explain risks openly in **Privacy & keys → Privacy & cloud providers** and link to each vendor’s official policies.

---

## API keys

| Storage mode | Default? | Location |
| ------------ | -------- | -------- |
| Forget when browser closes | **Yes** | `sessionStorage` (AES-GCM encrypted per tab) |
| Remember on this device | Opt-in | IndexedDB |

Keys are sent only to the provider you chose (OpenRouter, Groq, Google Gemini)
via HTTPS headers — not in URL query strings for Gemini.

**Never** paste keys into Custom Script or workflow labels — they can end up in
exported `.brainwire.json` files (export redacts common patterns, but prevention is better).

Clear all keys: **Privacy & keys** → **Clear all keys** (with confirmation).

---

## Cloud provider privacy (your responsibility)

Brainwire does **not** proxy cloud traffic. When you paste a key, the browser sends prompts,
files, audio, and images **directly** to OpenRouter, Groq, or Google under **their** terms.

In the app: **Privacy & keys** → **Privacy & cloud providers** — per-provider checklist with official links.
Implementation: `src/lib/cloudPrivacy.ts`.

| Provider | Configure on their site |
| -------- | ----------------------- |
| OpenRouter | [Privacy](https://openrouter.ai/settings/privacy), [Observability logging](https://openrouter.ai/settings/observability), [data-collection guide](https://openrouter.ai/docs/guides/privacy/data-collection) |
| Groq | [Legal / DPA](https://console.groq.com/docs/legal), [Privacy Policy](https://groq.com/privacy-policy/) |
| Gemini | [API Terms (paid vs unpaid)](https://ai.google.dev/gemini-api/terms), [Abuse monitoring & retention](https://ai.google.dev/gemini-api/docs/usage-policies), [ZDR](https://ai.google.dev/gemini-api/docs/zdr) |

**Honest caveat:** Free Gemini / AI Studio API keys are often classified as *Unpaid Services* —
Google may use content to improve products unless you are on paid terms. Read the current Terms.

Workflows with cloud Agents or cloud tools show a **Chat warning** before send (`src/lib/workflowPrivacy.ts`) — only when a key is saved and data would actually leave the browser.

**Intelligent setup:** cloud engines, models, and palette tools stay visible but **locked** until configured (`src/lib/brainSetup.ts`, `getPaletteItemLock` in `registry.ts`). The inspector shows **Setup required** with **Privacy & keys** and a link to the privacy checklist.

---

## Data stored locally

| Data | Storage | Notes |
| ---- | ------- | ----- |
| Saved workflows | IndexedDB (Dexie) | Canvas nodes/edges — includes optional per-block `locked` canvas flag |
| API keys (persistent mode) | IndexedDB | Opt-in only |
| API keys (session mode) | sessionStorage | Default; AES-GCM vault (`src/lib/sessionKeyVault.ts`) |
| Key save mode preference | localStorage | `brainwire-key-persistence` |
| Tutorial progress | localStorage | Per-quest completion flags |
| Welcome / canvas hints / palette | localStorage | UI preferences |
| OpenRouter model caches | localStorage | Public model list names (24h TTL) |
| Model rate-limit cooldowns | sessionStorage | Cleared when tab closes |
| Privacy consent seen | localStorage | First-launch notice |
| Agent performance advice seen | localStorage | WebLLM vs API keys notice on first launch |

Manage or wipe categories in **Privacy & keys** (`src/lib/appStorage.ts`). **Clear everything** removes all of the above plus resets the canvas.

**Export** (`.brainwire.json`) contains workflow structure — **not** Settings keys.
Config strings that look like API keys are **redacted** on export (all string fields in node data, including agent prompts and chat messages).

---

## Web fetching & SSRF

The **Web Scraper** only accepts public `http://` / `https://` URLs. These are **blocked**:

- `localhost`, `.local`, loopback, link-local
- Private IPv4 ranges (`10.x`, `172.16–31.x`, `192.168.x`, `127.x`)
- URLs with embedded username/password

See [TOOL-SAFETY.md](TOOL-SAFETY.md) for scraping ethics (ToS, robots.txt, 403 handling) and CORS proxy visibility.

---

## Custom Script sandbox

Runs in an isolated Web Worker with:

- No `fetch`, `importScripts`, `XMLHttpRequest`, or `WebSocket`,
- No DOM access,
- Execution timeout,
- Size limit on script source,
- Blob worker URL revoked after each run.

It is **not** a full security boundary against a determined attacker with
browser devtools — treat scripts as user code on their own machine.

---

## In-app safety notices

Curated high-risk tools show a plain-language **safety notice** in the block inspector (`src/lib/toolSafety.ts`). Cloud palette tools without a specific entry get a generic cloud notice.

**Local model downloads:** Transformers.js and WebLLM fetch public model weights from third-party CDNs (e.g. Hugging Face). That is a download, not sending your chat to us — but it is not “air-gapped” unless you stay fully offline after caching.

---

## Threats we accept

| Threat | Mitigation |
| ------ | ---------- |
| Malicious fork of the repo | Users should trust the source they download from |
| User wires cloud key + untrusted Custom Script | Documented; network blocked in worker; export redaction |
| User scrapes sites that forbid bots | Documented in inspector + TOOL-SAFETY; 403 messaging |
| SSRF via scraper to internal IPs | Hostname blocklist in `validateUrl.ts` |
| XSS in scraped web content | Scraper returns text; agents see raw content — treat untrusted URLs carefully |
| Shared computer key leakage | Session storage default; clear keys when done |
| CORS proxy sees requested URL | Documented; user chooses URLs |

---

## Reporting vulnerabilities

Please **do not** open public issues for exploitable security bugs.

Email or DM the maintainer via GitHub ([@sakurablush](https://github.com/sakurablush))
with:

- Description and impact,
- Minimal reproduction,
- Suggested fix if you have one.

We aim to acknowledge within 72 hours and patch critical issues promptly.

---

## Dependency hygiene

- `npm audit --audit-level=moderate` in CI (must be clean).
- Dependabot weekly PRs (npm + GitHub Actions, grouped).
- CodeQL weekly scan on `main` (`javascript-typescript`, `github/codeql-action@v4`).
- Dependency review on pull requests when `package-lock.json` changes.
- Production builds omit source maps (see `vite.config.ts`).

See [CI-AND-AUTOMATION.md](CI-AND-AUTOMATION.md).
