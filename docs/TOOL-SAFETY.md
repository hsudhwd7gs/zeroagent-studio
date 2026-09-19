# Tool safety guide

Plain-language warnings for tools that touch the network, your device, clipboard, cloud APIs, or user code.

**In the app:** select a tool block on the canvas — the inspector shows a colored **safety notice** when a tool needs extra care.

For the overall security model (keys, storage, reporting bugs), see [SECURITY.md](SECURITY.md).

---

## Web Scraper

**Risk level:** Network — highest care required.

You choose every URL. Brainwire does not decide what is “allowed.”

### What you must check yourself

1. **Terms of Service** — Many sites forbid automated access, scraping, or bots. If their rules say no, do not scrape.
2. **robots.txt** — Sites publish crawl rules at `https://example.com/robots.txt`. Respect `Disallow` paths.
3. **Login walls & paywalls** — If content needs an account or payment, you should not bypass it with this tool.
4. **403 Forbidden** — Treat this as “stop.” The site refused automated access. Do not treat it as a puzzle to work around.

### How fetching works technically

1. **Wikipedia** — Uses the public Wikipedia API when the URL is a wiki page.
2. **Jina Reader** — May fetch via `r.jina.ai` (third party sees the URL).
3. **Direct browser fetch** — Your browser requests the page (subject to CORS).
4. **Public CORS proxies** — If direct fetch fails, the app may try helper services (`allorigins.win`, `corsproxy.io`, `codetabs.com`). **Those services can see the URL you requested.**

### SSRF protection

The scraper **refuses** local and private network targets (`localhost`, `127.x`, `10.x`, `192.168.x`, link-local, etc.). Only public `http://` and `https://` URLs are accepted. URLs with embedded usernames/passwords are rejected.

### Downstream risk

Scraped text is passed to later blocks. If you wire an **Agent** with a cloud AI key, page content is sent to that provider. Treat scraped HTML/text as **untrusted input** — pages can contain misleading or hostile content.

### Good defaults

- Wikipedia and other pages you own or have explicit permission to use.
- Public documentation you are allowed to read programmatically.

---

## File Reader

**Risk level:** Privacy.

- Files are read **only on your device** — Brainwire has no upload server.
- If you connect File Reader → **Agent** with a cloud brain, **file contents leave your browser** and go to that AI provider.
- Exported `.brainwire.json` files contain block settings, **not** file contents.
- Do not load passwords, medical records, or secrets you would not paste into a third-party chat.

---

## Speech (listen / speak)

**Risk level:** Privacy.

- **Listen** asks for microphone permission. Audio is processed by your browser vendor’s speech APIs.
- Transcripts flow downstream — cloud Agents send text to your chosen provider.
- Use headphones in shared spaces; stop listening when finished.

---

## Clipboard

**Risk level:** Privacy.

- **Read** mode can capture whatever is on your clipboard — including passwords if you recently copied one.
- **Write** mode overwrites clipboard contents. Confirm before running in automated workflows.
- Some browsers block clipboard until you interact with the page.

---

## Custom Script

**Risk level:** Sandbox (user code).

Runs locally in a **Web Worker** with:

| Allowed | Blocked |
| ------- | ------- |
| `input`, `config`, `helpers` (JSON, trim, regex) | `fetch`, `importScripts`, `XMLHttpRequest`, `WebSocket` |
| Async `return` of a string | DOM access |
| | Network calls |

Still **your code**: infinite loops hit a timeout; bugs can fail a run. Never paste API keys into scripts — they can be saved in exported workflows (export now **redacts** common key patterns, but prevention is better).

---

## Cloud API tools

Applies to: **Groq Transcribe**, **Gemini Vision**, **Gemini Embeddings**, **OpenRouter Embeddings**, and any future cloud palette item.

**Risk level:** Cloud — data leaves your browser.

- Your browser sends data **directly** to the provider using **your** API key.
- Brainwire never sees your key or payload on a central server.
- Read each provider’s privacy policy before sending personal, confidential, or regulated data.
- Delete keys in **Privacy & keys** when done on a shared computer.

| Tool | What leaves the device |
| ---- | ---------------------- |
| Groq Transcribe | Audio bytes |
| Gemini Vision | Image bytes + prompt |
| Gemini Embeddings | Input text |
| OpenRouter Embeddings | Input text (routed to model provider) |

---

## Text Transform (regex modes)

**Risk level:** Standard.

Regex runs locally. Very complex patterns on huge strings can be slow (ReDoS-style slowdown). Avoid nested quantifiers on untrusted megabyte inputs.

---

## Browser manifest tools (encoding, hash, validate, …)

**Risk level:** Low.

Most palette presets (Base64, SHA-256, JSON pretty-print, validators) run **entirely in your browser** with no network. They process whatever upstream text you provide — do not chain secret material into cloud Agents unintentionally.

---

## Agents & Chat

Not tools, but part of the data path:

- **Cloud brain** — Messages and upstream context are sent to OpenRouter / Groq / Google per your key. Engines without a saved key are **locked** in the inspector; at run time the app may fall back to local Transformers.js and log a yellow note.
- **Local brain** — Transformers.js runs on-device; no cloud upload for inference (model weights download once from Hugging Face CDN).
- **Chat warning** — When a cloud Agent or unlocked cloud tool is on the canvas **and** you have the matching key, Chat shows a banner before send: your message and upstream content may leave the browser.
- **Privacy checklist** — **Privacy & keys → Privacy & cloud providers** links to official per-vendor settings (training, logging, paid vs unpaid terms).
- **Activity log** — May show truncated prompts/responses on screen; clear sensitive runs before sharing your screen.

---

## Intelligent setup (locked until ready)

We show every engine and cloud tool — nothing is hidden to bait you into paid tiers.

| UI signal | Meaning |
| --------- | ------- |
| Palette item **locked** (dashed, 🔒) | Cannot drag until requirement met (API key or browser feature) |
| Inspector **Setup required** | Explains what is missing; **Privacy & keys** opens the panel |
| Agent badge **🔒 OR** / **🔒 Groq** | Engine selected but not configured on this device |
| Toolbar **lock** on selected block | Canvas lock — block cannot move, resize, delete, or rewire until unlocked |
| Model dropdown disabled | Fix the engine setup first |

This is education, not upsell: a free OpenRouter key is recommended for speed; Transformers.js always works without a key if you prefer local inference.

---

## Export & import

- `.brainwire.json` exports include workflow structure and tool config strings.
- **Settings API keys are never exported.**
- If you accidentally pasted a key into a script, agent prompt, chat message, or config field, export **redacts** common patterns (`sk-or-…`, `gsk_…`, `AIza…`) across all node data.
- Still: **never store secrets in workflows.**

---

## Quick decision tree

```
Does this tool fetch a URL you did not choose?     → No (you always pick or upstream provides it)
Does the site forbid bots in ToS / robots.txt?   → Do not scrape
Did you get 403 Forbidden?                       → Stop
Does data go to a cloud API?                     → Read provider policy; no secrets
Does the tool read files / mic / clipboard?      → Fine locally; caution if wired to cloud Agent
```

---

## Reporting safety gaps

If a tool should warn users and does not, or if you find a sandbox/network bypass, report privately per [SECURITY.md](../SECURITY.md) — do not open public issues for exploitable bugs.
