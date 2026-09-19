import type { BrainType } from '../types'

/** Human names for UI — avoid raw engine ids in front of users */
export function getBrainDisplayName(brain: BrainType): string {
  switch (brain) {
    case 'transformers':
      return 'Transformers.js — local (first run downloads a model)'
    case 'local':
      return 'WebLLM — slow local fallback (large download)'
    case 'openrouter':
      return 'OpenRouter — recommended (free with key)'
    case 'groq':
      return 'Groq — fast free tier'
    case 'gemini':
      return 'Gemini — Google free tier'
    default:
      return brain
  }
}
