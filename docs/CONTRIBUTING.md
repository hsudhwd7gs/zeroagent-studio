# Contributing to Brainwire

Thank you for helping make AI workflows accessible to everyone — especially people
who cannot pay for subscriptions or new hardware.

This document covers setup, the quality gate, and what we look for in PRs.
The in-app **Guide** (`#/guide`) is the user manual; keep it in sync when you
change quests, tools, or ports.

---

## Ground rules

1. **Run `npm run ci` before opening a PR.** Same gate as GitHub Actions:
   `npm audit` (moderate+) → lint → typecheck → `test:coverage` (100%) → build.
2. **Smallest effective diff.** If twelve lines fix it, do not ship forty.
3. **Test or it does not ship.** New logic in `src/lib`, `src/tools`, stores,
   or orchestrator needs Vitest coverage — thresholds are enforced.
4. **No secrets in git.** API keys belong in the browser Settings panel only.
5. **Registry-driven tools.** Do not hardcode palette entries in `dag.ts` or
   `NodePalette.tsx` — add manifest rows or curated tools in `src/tools/`.
6. **Empathy in copy.** Users may be on shared computers, slow laptops, or
   first-time builders. Avoid shame, jargon without explanation, or “just buy
   a better machine.”
7. **Follow the [Code of Conduct](../CODE_OF_CONDUCT.md).**
8. **Do not commit ephemeral AI plans.** Paths like `.cursor/plans/` are
   gitignored — see [`.gitignore`](../.gitignore).
9. **Catalog counts in user-facing copy** must come from `src/lib/siteStats.ts`
   (or the registry directly in tests) — never hardcode “102 tools” in new UI.

---

## Local setup

Requires **Node.js 22** (matches CI). Clone your fork:

```bash
git clone https://github.com/<your-username>/brainwire.git
cd brainwire
npm install
npm run dev
```

Open <http://localhost:5173/> (Vite dev server).

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Local dev server with HMR |
| `npm test` | Vitest watch mode |
| `npm run test:coverage` | Coverage report (100% required) |
| `npm run ci` | Full gate — run before every push |
| `npm run build` | Production bundle in `dist/` |
| `npm run preview` | Serve `dist/` locally |

---

## What we especially welcome

### New browser tools

- **Manifest preset** (text transforms, validators): row in
  `src/tools/manifests/index.ts` + handler in `src/tools/engines/*Runner.ts`
  + config fields in `src/lib/manifestConfigFields.ts` when needed.
- **Curated module** (file picker, mic, cloud API): `src/tools/<name>.ts` +
  entry in `CURATED_TOOLS` inside `registry.ts`.

See [`.cursor/skills/add-browser-tool/SKILL.md`](../.cursor/skills/add-browser-tool/SKILL.md).

### Tutorial / quest improvements

Update together when changing guided flows:

| Artifact | Path |
| -------- | ---- |
| Quest steps | `src/lib/quests/` (re-exported from `src/lib/tutorialQuests.ts`) |
| Auto-advance rules | `src/lib/tutorialValidators.ts` |
| In-app manual | `src/components/guide/GuidePage.tsx` |
| Repo overview | `README.md` |

### Documentation

- User-facing: **Guide** page first, then `README.md`.
- Maintainer-facing: `docs/` (architecture, security, deployment, CI).

---

## Pull request checklist

1. Fork → feature branch → focused commits.
2. `npm run ci` is green locally.
3. Tests cover new branches and edge cases.
4. Guide / README updated if behavior or copy changed.
5. No `package-lock.json` drift without intentional dependency changes.
6. If `package-lock.json` changed, confirm **Dependency review** passes on the PR.
7. Fill out the [PR template](../.github/pull_request_template.md).

Maintainers use [CODEOWNERS](../.github/CODEOWNERS) for review signals.
Merge requires the **CI** workflow to pass (enable branch protection on `main`).

---

## Cursor / agent skills

Portable workflow guides live in [`.cursor/skills/`](../.cursor/skills/) —
`pre-commit-ci`, `add-browser-tool`, `ship-patch`, and others. They encode
layer boundaries and the `npm run ci` gate for coding assistants.

---

## Questions?

Open a [Discussion](https://github.com/sakurablush/brainwire/discussions)
or an issue with the feature template. Security issues: see [SECURITY.md](../SECURITY.md).
