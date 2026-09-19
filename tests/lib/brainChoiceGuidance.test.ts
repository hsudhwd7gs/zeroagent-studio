import { describe, it, expect } from 'vitest'
import {
  CHAT_INPUT_PLACEHOLDER,
  DAG_NO_BRAIN_ERROR,
  OPENROUTER_RECOMMENDED_LEAD,
  SETTINGS_SKIP_KEYS_NOTE,
  TRANSFORMERS_LOCAL_LEAD,
} from '../../src/lib/brainChoiceGuidance'

describe('brainChoiceGuidance', () => {
  it('recommends OpenRouter before local Transformers', () => {
    expect(OPENROUTER_RECOMMENDED_LEAD.toLowerCase()).toContain('recommended')
    expect(OPENROUTER_RECOMMENDED_LEAD).toContain('OpenRouter')
    expect(TRANSFORMERS_LOCAL_LEAD).toContain('Transformers.js')
    expect(TRANSFORMERS_LOCAL_LEAD).toContain('downloads')
  })

  it('exports runtime strings used by chat and dag', () => {
    expect(CHAT_INPUT_PLACEHOLDER).toContain('free with a key')
    expect(DAG_NO_BRAIN_ERROR).toContain('OpenRouter')
    expect(SETTINGS_SKIP_KEYS_NOTE).toContain('recommend')
  })
})
