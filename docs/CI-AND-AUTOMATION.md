# CI and automation

How GitHub Actions, Dependabot, and labels work in this repo.

---

## Workflows overview

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| **CI** | Push/PR to `main`, manual | `npm run ci` + coverage artifact |
| **Deploy** | Push to `main`, manual | Build `dist/` → GitHub Pages |
| **Release** | Push tag `v*`, manual | `npm run ci` → GitHub Release from CHANGELOG |
| **CodeQL** | Push/PR, weekly Mon 06:00 UTC, manual | JavaScript/TypeScript security scan |
| **Dependency review** | Pull request | Flags risky dependency changes |
| **Labeler** | PR opened/sync | Path-based labels |

There is **no npm publish workflow** — this project is not an npm package. Tag `v0.1.0` (matching `package.json`) to cut a GitHub Release.

Workflow files: [`.github/workflows/`](../.github/workflows/README.md).

---

## CI merge gate

The `ci` script in `package.json`:

```text
npm audit --audit-level=moderate
  → lint
  → typecheck
  → test:coverage (100% statements/branches/functions/lines)
  → build
```

**Recommended branch protection:** require status checks **CI** (and optionally **Dependency review** when lockfile changes) before merge.

Deploy trusts CI on `main` and only runs `npm run build` for defense-in-depth.

---

## Deploy

See [DEPLOYMENT.md](DEPLOYMENT.md). Uses `actions/deploy-pages` + OIDC —
no long-lived `GITHUB_TOKEN` in secrets for Pages.

Live site (canonical): <https://sakurablush.github.io/brainwire/>

---

## CodeQL

- Language: `javascript-typescript` (covers JS + TS), `build-mode: none` (no compile step).
- Action: `github/codeql-action@v4` (v3 is deprecated; EOL December 2026).
- Query pack: `security-and-quality`.
- Results appear under **Security → Code scanning**.

---

## Dependency review

[`.github/workflows/dependency-review.yml`](../.github/workflows/dependency-review.yml) runs on every pull request and surfaces known-vulnerable or incompatible dependency changes before merge. Complements `npm audit` in CI and CodeQL.

---

## Dependabot

[`.github/dependabot.yml`](../.github/dependabot.yml) — weekly **npm** and **GitHub Actions** updates,
grouped (Vite/React, testing, TypeScript/ESLint, AI runtimes, security; Actions in one group).

Verify every Dependabot PR with **CI** before merge.

---

## Labels

[`.github/labeler.yml`](../.github/labeler.yml) applies on PRs:

| Label | Paths |
| ----- | ----- |
| `ci` / `infrastructure` | `.github/**` |
| `dependencies` | `package.json`, lockfile |
| `code` | `src/**` |
| `tests` | `tests/**` |
| `tools` | `src/tools/**` |
| `security` | SECURITY docs, key storage, custom script |
| `documentation` | `docs/**`, `*.md` |

---

## Coverage artifact

CI uploads `coverage/` for 30 days — useful when reviewing PRs without a local run.

---

## Local parity

```bash
npm ci
npm run ci
```

Must match GitHub Actions before you push.

Shared Node setup in CI matches [`.github/actions/setup-node`](../.github/actions/setup-node/action.yml): Node 22, Corepack from `packageManager`, then `npm ci`.
