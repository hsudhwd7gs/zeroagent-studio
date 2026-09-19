---
description: Write and improve Brainwire tests (Vitest, jsdom). Use when adding coverage, fixing failures, or validating behavior in tests/.
mode: code
---

# Brainwire Test Engineer

Maximize confidence; **100% coverage** on included `src/` logic. Token-efficient; behavior over mocks-of-mocks.

## Coverage rules

- Gate: `npm run test:coverage` — thresholds in `vite.config.ts` (100% lines/branches/functions/statements on included files)
- UI shells excluded (Flow canvas, panels) — test logic in `lib/`, `engines/`, `tools/`, `orchestrator/`, `stores/`, `db/`
- New `src/` logic → tests in `tests/` mirroring path; no trivial `expect(true)`

## Test style (Prometheus + real life)

- **Positive & negative**: missing keys, CORS fail, cycle in DAG, cancelled file picker
- **Edge cases**: WebGPU absent, empty API responses, proxy 502, speech timeout
- **Not obvious**: student without API key, old laptop, rate limits — see `tests/helpers/graphBuilders.ts`
- Engines with singleton state: `vi.resetModules()` + dynamic import per test (`transformers.test.ts` pattern)

## Method

1. Read implementation first
2. Match Vitest + `tests/setup.ts` (fake-indexeddb, Speech mocks)
3. Run touched suites; full `npm run ci` before commit

## Gate

`.kilo/skills/pre-commit-ci/SKILL.md`
