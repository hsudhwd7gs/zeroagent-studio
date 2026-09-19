# Agent instructions

This file is the single landing page for coding assistants (Cursor, Kilo
Code, Claude Code, Aider, …) working on **Brainwire** — a
free-hosting, browser-native AI workflow editor on GitHub Pages.

The authoritative source for humans is
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). When anything below
conflicts with `CONTRIBUTING.md`, **the docs win**.

> **Sections:** [TL;DR](#tldr) · [Architecture](#non-negotiable-architecture) ·
> [Project boundaries](#project-boundaries) · [Before you change code](#before-you-change-code) ·
> [Portable skills](#portable-skills) · [Personas](#specialized-personas-kilo) ·
> [Commands](#quick-commands-kilo) · [Adding things](#adding-things) ·
> [Ignore & secret scanning](#assistant-ignore--secret-scanning) ·
> [Do not commit](#do-not-commit) · [Security](#security)

## TL;DR

1. **Read first** — [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. **No backend.** No Express, no DB server, no API routes, no env secrets in the repo.
3. **Registry-driven.** Tools in `src/tools/registry.ts` + manifests — never hardcode in `dag.ts` or palette.
4. **Honest brain guidance.** OpenRouter recommended when users can paste a free key; Transformers.js is the no-key local path (`brainResolver.ts`, `brainChoiceGuidance.ts`).
5. **100 % test coverage** on included `src/` (`vite.config.ts` excludes UI shells). Catalog count is dynamic via `getSiteStats()`.
6. **Quality gate:** `npm ci` + `npm run ci` — must be green before any commit or PR.
7. **Never commit** plans, secrets, build artifacts, or hardcoded catalog numbers.
8. **Ask the user** before: adding a dependency, bumping `package.json` / lockfile, deploying, tagging a release, or pushing.

## Non-negotiable architecture

| Rule | Detail |
|------|--------|
| **No backend** | No Express, Fastify, Koa, Hapi, Django, Flask, Rails, Prisma, Drizzle, Mongo/Postgres/SQL drivers, Firebase/Supabase SDKs, auth servers, telemetry SDKs, or analytics |
| **Static SPA** | `vite.config.ts` `base: './'`; hash routes `#/` / `#/guide` via `src/lib/appRoute.ts`; Pages deploy via `.github/workflows/deploy.yml` |
| **BYOK** | API keys in Dexie / IndexedDB / `sessionStorage` only; browser calls providers directly — never our servers |
| **Forkable** | `npm ci` + `npm run build` produces `dist/` — anyone can fork, build, and self-host on Pages |
| **Trusted educator** | No analytics, no backend that sees user data, honest cloud caveats in copy |

## Project boundaries

| Layer | Location | Rule |
|-------|----------|------|
| Tools (palette, ports, run) | `src/tools/registry.ts` + manifests | **Do not** hardcode in `dag.ts` or palette |
| AI providers (BYOK) | `src/engines/` + `src/lib/brainResolver.ts` | OpenRouter-first when key saved; else Transformers.js fallback |
| Canvas / UI shells | `src/components/` | Excluded from coverage; test logic in `src/lib` |
| Workflows (state + I/O) | `src/stores/workflowStore.ts`, `src/lib/workflowIo.ts` | API keys never in exports or URLs; canvas lock in `nodeCanvasLock.ts` |
| Orchestrator | `src/orchestrator/dag.ts` | Registry-driven, no per-tool `switch` |
| **Catalog counts** | `src/lib/siteStats.ts` | **Test-enforced** — never hardcode any tool total in copy |
| **Privacy copy** | `src/lib/cloudPrivacy.ts`, `src/lib/brainChoiceGuidance.ts` | Single source of truth for cloud + brain onboarding copy |

## Before you change code

1. **Read** [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — first time or after a long break.
2. **Match existing patterns** in the file you edit. Smallest correct diff. No unrelated refactors.
3. **Run the gate** before any commit: `npm ci && npm run ci` (audit → lint → typecheck → test:coverage 100 % → build). Never commit on red.
4. **Cover new behavior** in `tests/` — real scenarios, not trivial `expect(true)`. See `.kilo/rules/06-test-engineer.md` (Kilo) or `.cursor/rules/brainwire-test-engineer.mdc` (Cursor).
5. **Update user-facing docs in the same PR** when behavior changes: README, in-app **Guide** (`src/components/guide/GuidePage.tsx`), [docs/SECURITY.md](docs/SECURITY.md), [docs/TOOL-SAFETY.md](docs/TOOL-SAFETY.md), and [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
6. **Use the PR template** at [.github/pull_request_template.md](.github/pull_request_template.md). CODEOWNERS routes review at [.github/CODEOWNERS](.github/CODEOWNERS).
7. **Never commit, push, deploy, or tag a release** without explicit user confirmation. See `.kilo/kilo.jsonc` `permission.edit` for the supply-chain-guarded paths.

## Portable skills

Two parallel sets of agent playbooks stay in sync. If you change a
Cursor rule / skill, mirror the edit in `.kilo/` (or vice versa) so a
developer switching tools does not lose context.

| Folder | Tool | Format |
|--------|------|--------|
| [`.cursor/rules/`](.cursor/rules/) | Cursor | `.mdc` with `globs` + `alwaysApply` |
| [`.cursor/skills/`](.cursor/skills/) | Cursor | `SKILL.md` with `name` + `description` |
| [`.kilo/kilo.jsonc`](.kilo/kilo.jsonc) | Kilo | JSONC schema with `permission.*`, `instructions`, `watcher.ignore` |
| [`.kilo/rules/`](.kilo/rules/) | Kilo | `.md` loaded via `instructions` glob (numbered `01-…` to `10-…`) |
| [`.kilo/skills/`](.kilo/skills/) | Kilo | `SKILL.md` with `name` + `description` |
| [`.kilo/agents/`](.kilo/agents/) | Kilo | `mode: primary` personas with scoped `permission` blocks |
| [`.kilo/command/`](.kilo/command/) | Kilo | Slash commands (`/pre-commit-ci`, `/ship-patch`, …) |

## Specialized personas (Kilo)

Switch via `/agents` or `Cmd+.` in Kilo. Each persona has scoped
permissions and an optimal model override.

| Persona | Mode | Use for | Model |
|---------|------|---------|-------|
| `brainwire-engineer` | primary | Implement features, fix bugs (default engineering) | Sonnet |
| `brainwire-planner` | primary | Design + trade-offs, no code | Sonnet |
| `brainwire-reviewer` | primary | PR review, quality, blockers (read-only) | Sonnet |
| `brainwire-debugger` | primary | Root-cause analysis + smallest fix | Sonnet |
| `brainwire-test-engineer` | primary | Vitest + 100 % coverage gate | Sonnet |
| `brainwire-security-auditor` | primary | Threat model + secret/key review | Sonnet |
| `brainwire-advisor` | primary | Read-only Q&A (no subagents) | Haiku (fast) |

The built-in Kilo agents (`code`, `plan`, `ask`, `debug`) are still
available — the Brainwire personas add project-specific knowledge on top.

## Quick commands (Kilo)

Type the slash command in chat to invoke a multi-step workflow.

| Command | What it does |
|---------|--------------|
| `/pre-commit-ci` | Run `npm run ci` and report results token-efficiently |
| `/ship-patch` | End-to-end patch: implement → test → review → version → commit (user must ask) |
| `/release-versioning` | SemVer bump, CHANGELOG, deploy gate |
| `/review-before-merge` | Pre-merge structured review (CI, architecture, security) |
| `/add-browser-tool` | Walk through adding a manifest preset or curated tool |
| `/add-brain-provider` | Walk through adding a BYOK or local brain |

## Adding things

| Goal | Start here |
|------|------------|
| New transform tool (manifest preset) | [`.kilo/skills/add-browser-tool/SKILL.md`](.kilo/skills/add-browser-tool/SKILL.md) |
| New file / network / cloud / sandbox tool (curated) | [`.kilo/skills/add-browser-tool/SKILL.md`](.kilo/skills/add-browser-tool/SKILL.md) |
| New AI provider (BYOK or local) | [`.kilo/skills/add-brain-provider/SKILL.md`](.kilo/skills/add-brain-provider/SKILL.md) |
| New guided quest | `src/lib/quests/` + `tutorialValidators.ts` + `GuidePage.tsx` + `README.md` (sync all) |
| New shared rule | Copy [`.kilo/rules/02-engineer.md`](.kilo/rules/02-engineer.md) and the matching `.cursor/rules/brainwire-engineer.mdc` |
| New agent persona | Copy [`.kilo/agents/brainwire-engineer.md`](.kilo/agents/brainwire-engineer.md) and adjust the `permission` block |
| New slash command | Copy [`.kilo/command/pre-commit-ci.md`](.kilo/command/pre-commit-ci.md) and set the `agent:` frontmatter |
| Connection rules | `src/lib/ports.ts` + `src/lib/nodePorts.ts` + `src/lib/connectionValidation.ts` (with tests) |

## Assistant ignore & secret scanning

Defense-in-depth: the same secret/credential patterns live in four
places. Keep them in sync — when you add a pattern, update all four.

| File | Purpose | Audience |
|------|---------|----------|
| [`.gitignore`](.gitignore) | What Git must not track | Git |
| [`.cursorignore`](.cursorignore) | What Cursor must not load into context | Cursor |
| [`.kilocodeignore`](.kilocodeignore) | What Kilo Code must not load into context (legacy + IgnoreMigrator) | Kilo Code |
| [`.kilo/kilo.jsonc`](.kilo/kilo.jsonc) `permission.read` + `permission.edit` | Per-tool deny rules (modern) | Kilo Code |

**Patterns covered (all four):** `.env*`, `*.pem`, `*.key`, `*.p12`,
`*.pfx`, `*id_rsa*`, `*id_ed25519*`, `*id_ecdsa*`, `*.gpg`, `*.asc`,
`.netrc`, `.aws/`, `.gcp/`, `.azure/`, `.gcloud/`, `.ssh/`,
`credentials/`, `secrets/`, `node_modules/`, `dist/`, `coverage/`,
`*.map`, `*.tsbuildinfo`.

**Automated scanning:** CI runs CodeQL (`github/codeql-action@v4`, `javascript-typescript`,
`security-and-quality` query pack, weekly Monday 06:00 UTC) + PR **dependency review**
+ Dependabot (weekly npm + GitHub Actions, grouped). Locally, install
[gitleaks](https://github.com/gitleaks/gitleaks) or
[trufflehog](https://github.com/trufflehog/trufflehog) for the same
coverage before opening a PR.

## Do not commit

| Category | Examples | Where defined |
|----------|----------|---------------|
| **Ephemeral AI state** | `.cursor/plans/`, `.cursor/scratch/`, `.cursor/snapshots/`, `.kilo/plans/`, `.kilo/worktrees/`, `.kilo/agent-manager.json`, `.kilo/sessions/`, `.kilo/logs/`, `.kilo/scratch/`, `.kilo/snapshots/`, `.claude/plans/`, `.claude/settings.local.json`, `.aider*`, any `**/plan*.md` | [`.gitignore`](.gitignore) |
| **Secrets & credentials** | `.env*`, `*.pem`, `*.key`, `*id_rsa*`, `*.gpg`, `.netrc`, `.aws/`, `.gcp/`, `.azure/`, `.ssh/`, `credentials/`, `secrets/` | all four ignore files |
| **Build & test artifacts** | `dist/`, `coverage/`, `node_modules/`, `*.map`, `*.tsbuildinfo`, `playwright-report/`, `test-results/`, `lcov.info` | [`.gitignore`](.gitignore) |
| **Lockfile drift** | `package-lock.json` without matching `package.json` (or vice versa) | convention |
| **Hardcoded catalog numbers** | "300+ tools" or any specific count anywhere in copy — use `getSiteStats()` or `siteStats.ts` instead | test-enforced |
| **Personal editor noise** | `.vscode/*` (keep only `extensions.json` + `settings.json`), `.idea/` | [`.gitignore`](.gitignore) |
| **Debug noise** | `console.log`, `debugger;`, `// TODO: remove` in committed code | convention |

## Security

- **API keys:** session storage default (AES-GCM vault in `sessionKeyVault.ts`); never in exports, URLs, screenshots, or test fixtures. `src/lib/keyStorage.ts`.
- **Custom Script:** runs in a Web Worker with no `fetch` / `importScripts` / `XHR` / `WebSocket`; warn users not to paste secrets.
- **Web scraper:** text extraction only — never inject untrusted HTML into the React DOM. SSRF blocklist in `src/lib/validateUrl.ts` (no loopback, private IPs, embedded credentials). CORS proxies see requested URLs — document the trust boundary.
- **Speech / mic:** activate only on explicit tool run; handle permission errors gracefully.
- **Model downloads:** WebLLM and Transformers.js pull from third-party CDNs (Hugging Face, …). It is a download, not us receiving your chat — but pin versions and treat as supply-chain.
- **Dependencies:** `npm audit --audit-level=moderate` is part of `npm run ci`; Dependabot PRs grouped weekly; review every engine bump; dependency review on PRs when lockfile changes.
- **Export redaction:** `.brainwire.json` strips common API-key patterns in all string fields (config, prompts, chat messages). Prevention is still better.
- **Docs must match code** — if behavior changes (privacy UI, locked tools, export redaction, safety notices), update README, **Guide**, [docs/SECURITY.md](docs/SECURITY.md), and [docs/TOOL-SAFETY.md](docs/TOOL-SAFETY.md) in the **same PR**.

We are a **trusted educator**, not a token funnel: no analytics, no
backend that sees user data, honest cloud caveats in copy.

Full model: [docs/SECURITY.md](docs/SECURITY.md). Per-tool warnings:
[docs/TOOL-SAFETY.md](docs/TOOL-SAFETY.md). Privacy copy source:
`src/lib/cloudPrivacy.ts`.

---

**Quality gate:** `npm ci && npm run ci` — green only.
**Live site:** <https://sakurablush.github.io/brainwire/>
**Tone:** plain language, explain jargon, no shame, no "just buy a better machine" — see "Empathy in copy" in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
