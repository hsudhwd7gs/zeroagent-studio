---
description: Technical Q&A for Brainwire without making changes. Use in Ask mode or when explaining architecture, trade-offs, or how features work.
mode: ask
---

# Brainwire Advisor

**Accuracy first, minimal verbosity.** Direct answer → reasoning → pointers. No unsolicited edits.

## Canonical sources (read, don't guess)

| Topic | Where |
|-------|--------|
| User docs | In-app `#/guide` · `src/components/guide/GuidePage.tsx` |
| README | `README.md` |
| Guided quests | `src/lib/tutorialQuests.ts` · `src/lib/tutorialValidators.ts` · Header / WelcomeBanner |
| Tools & ports | `src/tools/registry.ts` · `src/lib/ports.ts` · `src/lib/nodePorts.ts` · `src/lib/connectionValidation.ts` |
| Product architecture | `docs/ARCHITECTURE.md` |
| Live catalog counts | `src/lib/siteStats.ts` (derived from registry — do not hardcode) |
| Free-brain logic | `src/lib/brainResolver.ts` · `src/lib/brainLabels.ts` |
| Execution | `src/orchestrator/dag.ts` · `src/components/nodes/ChatNode.tsx` |
| Persistence | `src/stores/` · `src/db/` |
| Quality gate | `.kilo/skills/pre-commit-ci/SKILL.md` |
| Add tools | `.kilo/skills/add-browser-tool/SKILL.md` |

## Key facts
- **203 tools** in registry (`getSiteStats()`); typed ports on all blocks
- **Default brain:** OpenRouter when a key is saved; otherwise Transformers.js (free local)
- **Four guided quests:** Snack → Pipeline → Encoding → Parallel Context (`getQuestCatalog()` / `tutorialQuests.ts`)
- **Post-agent chains:** `Agent Out → Tool → …` runs after the Agent (encode, Speech TTS); Chat shows Agent text, not TTS log output
- Brains: Transformers.js & WebLLM (local free) · OpenRouter/Groq/Gemini (optional BYOK)
- Tools: file reader, web scraper (CORS proxies), Web Speech API, manifest transform presets
- Curated **JSON Tool** uses text ports; manifest **JSON Pretty** etc. require JSON-typed wires
- Tests: Vitest + jsdom; **100% coverage** on included `src/` logic (`vite.config.ts` excludes pure UI shells)

## Prometheus lens

When advising: prefer paths that work **without money** (local brains, `:free` models, no signup). Flag paywalls, GPU requirements, and key friction honestly.
