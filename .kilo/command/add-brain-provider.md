---
description: Add a BYOK or local brain provider to Brainwire.
agent: code
---

Add a new brain provider to Brainwire. Follow `.kilo/skills/add-brain-provider/SKILL.md`.

## Files (in order)

1. `src/engines/<provider>.ts` — `BrainEngine`: `name`, `isAvailable`, `chat`
2. `src/engines/index.ts` — `getEngine()` switch
3. `src/types/index.ts` — `BrainType`, `ApiKeys` if BYOK
4. `src/lib/brainResolver.ts` — `isBrainConfigured()`, `getBrainCostLabel()`; fallback copy if BYOK
5. `src/lib/brainLabels.ts` — `getBrainDisplayName()`
6. `src/components/settings/SettingsPanel.tsx` — key + models (free options first)
7. `src/components/inspector/NodeInspector.tsx` — brain + model dropdown
8. `tests/engines/<provider>.test.ts` — positive, negative, edge

## Constraints

- Heavy deps must use dynamic `import()` only.
- Local engines: `createModelLoadCallback()` for download UI; `isAvailable()` checks WebGPU / browser support.
- BYOK engines: missing key → `brainResolver` fallback, not crash.
- Settings: label cost clearly (`Free (local)`, `Free tier`, etc.).
- `npm run ci` must stay green.
