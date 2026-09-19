# Release checklist

Use this before tagging a release or announcing a major update on `main`.

## Code quality

- [ ] `npm run ci` passes locally (audit, lint, typecheck, 100% coverage, build)
- [ ] No secrets, API keys, or `.env` files in the diff
- [ ] User-facing copy updated in **Guide** and **README** if behavior changed

## Documentation

- [ ] [CHANGELOG.md](../CHANGELOG.md) updated under `[Unreleased]` or new version section
- [ ] [docs/SECURITY.md](SECURITY.md) and [docs/TOOL-SAFETY.md](TOOL-SAFETY.md) still accurate if storage, network, inspector notices, **privacy panel**, **canvas lock**, or **locked setup UX** changed

## GitHub

- [ ] **CI** workflow green on `main`
- [ ] **Deploy** workflow published the latest `dist/` to Pages
- [ ] **CodeQL** has no unaddressed critical findings
- [ ] **Dependency review** is clean on the release PR (if dependencies changed)
- [ ] Branch protection requires **CI** before merge (recommended)

## After tagging

Push a tag that matches `package.json` `version` — the **Release** workflow runs `npm run ci` and creates a GitHub Release from CHANGELOG:

```bash
git tag -a v0.1.0 -m "v0.1.0 — first public release"
git push origin v0.1.0
```

Or create a release manually and paste notes from CHANGELOG.

Extract notes locally: `node scripts/extract-changelog-section.mjs 0.1.0 --stdout`

## GitHub repository (first publish)

One-time settings on [github.com/sakurablush/brainwire](https://github.com/sakurablush/brainwire):

- [ ] **Settings → Pages → Source → GitHub Actions**
- [ ] **Settings → General → Features** — enable **Discussions** (optional community hub)
- [ ] **About** (right sidebar) — paste `description` from `package.json`; Website: `https://sakurablush.github.io/brainwire/`; topics (max 20): `ai-agents`, `visual-ai`, `workflow-builder`, `browser-ai`, `local-llm`, `openrouter`, `react`, `typescript`, `no-code`, `education`, `privacy-first`, `github-pages`, `open-source`, `transformers-js`, `webllm`, `agentic-ai`, `drag-and-drop`, `reactflow`, `huggingface`, `tutorial`
- [ ] **Settings → Branches** — protect `main`, require **CI** status check
- [ ] Push all files, confirm **CI** + **Deploy** workflows are green

## Fork hosts

Fork owners only need [DEPLOYMENT.md](DEPLOYMENT.md) — enable **Pages → GitHub Actions**
once on their fork.
