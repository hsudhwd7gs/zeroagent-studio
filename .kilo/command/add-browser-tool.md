---
description: Add a browser-native or cloud tool to Brainwire (manifest preset or curated module).
agent: code
---

Add a new tool to Brainwire. Follow `.kilo/skills/add-browser-tool/SKILL.md`.

## Choose a path

| Path | When | Files |
|------|------|-------|
| **Manifest preset** | Simple text/JSON transform, no UI, no side effects | `src/tools/manifests/index.ts` + `src/tools/engines/*Runner.ts` |
| **Curated module** | File picker, mic, fetch, cloud API, custom inspector | `src/tools/<tool>.ts` + `CURATED_TOOLS` in `src/tools/registry.ts` |

## Required follow-ups

1. Add engine fixture tests in `tests/tools/engines/allRunners.test.ts` (manifest) or `tests/tools/<tool>.test.ts` (curated).
2. `catalog.test.ts` enforces ≥100 tools, unique ids, and port defs — make sure it passes.
3. If user-visible: update `#/guide` Tools section + `README.md` tool table.
4. `npm run ci` must stay green.

Do NOT add a `switch` in `dag.ts` or hardcode tools in `NodePalette.tsx` — the registry drives palette, icons, inspector labels, and execution.
