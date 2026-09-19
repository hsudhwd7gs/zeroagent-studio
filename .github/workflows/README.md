# GitHub Actions workflows

| Workflow | File | Docs |
| -------- | ---- | ---- |
| CI | [`ci.yml`](ci.yml) | [CI and automation](../../docs/CI-AND-AUTOMATION.md) |
| Deploy | [`deploy.yml`](deploy.yml) | [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) |
| Release | [`release.yml`](release.yml) | [RELEASE-CHECKLIST.md](../../docs/RELEASE-CHECKLIST.md) |
| CodeQL | [`codeql.yml`](codeql.yml) | [CI and automation](../../docs/CI-AND-AUTOMATION.md#codeql) |
| Dependency review | [`dependency-review.yml`](dependency-review.yml) | [CI and automation](../../docs/CI-AND-AUTOMATION.md#dependency-review) |
| Labeler | [`labeler.yml`](labeler.yml) | [CI and automation](../../docs/CI-AND-AUTOMATION.md#labels) |

**Shared composite action:** [`.github/actions/setup-node`](../actions/setup-node/action.yml) — Node 22 + `npm ci` (Corepack from `packageManager`).

**Dependabot:** [`../dependabot.yml`](../dependabot.yml) — npm + GitHub Actions, weekly.

**Issue templates:** [`../ISSUE_TEMPLATE/`](../ISSUE_TEMPLATE/)

**Funding:** [`../FUNDING.yml`](../FUNDING.yml) — crypto donation links only

There is **no npm publish workflow** — Brainwire is a static browser app deployed to GitHub Pages only. Pushing a `v*` tag triggers **Release** (CI + GitHub Release notes from CHANGELOG).

## Action versions (pinned majors)

| Action | Version | Notes |
| ------ | ------- | ----- |
| `actions/checkout` | v7 | Node 24 runtime |
| `actions/setup-node` | v6 | npm cache; respects `packageManager` |
| `github/codeql-action/*` | v4 | Replaces deprecated v3 (EOL Dec 2026) |
| `actions/upload-artifact` | v7 | CI coverage artifact |
| `actions/upload-pages-artifact` | v5 | Pairs with `deploy-pages@v5` |
| `actions/deploy-pages` | v5 | Node 24 runtime |
| `actions/labeler` | v6 | Path-based PR labels |
| `actions/dependency-review-action` | v5 | Supply-chain PR gate |
| `softprops/action-gh-release` | v3 | Release workflow |

Runners: `ubuntu-24.04` (explicit; matches current `ubuntu-latest` on GitHub-hosted runners).
