import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pickBestFreeBrain,
  resolveAgentBrain,
  getDefaultAgentBrain,
  getBrainCostLabel,
  isBrainAvailable,
  DEFAULT_TRANSFORMERS_MODEL,
  OPENROUTER_FREE_ROUTER,
} from '../../src/lib/brainResolver'
import { AUTO_ROTATE_MODEL } from '../../src/lib/modelRotation'
import * as webllm from '../../src/engines/webllm'

vi.mock('../../src/engines/webllm', () => ({
  isWebGPUAvailable: vi.fn(),
}))

const mockedWebGPU = vi.mocked(webllm.isWebGPUAvailable)

describe('brainResolver', () => {
  beforeEach(() => {
    mockedWebGPU.mockReturnValue(false)
  })

  describe('pickBestFreeBrain', () => {
    it('picks Transformers.js as CPU-friendly fallback', () => {
      const result = pickBestFreeBrain()
      expect(result.brain).toBe('transformers')
      expect(result.model).toBe(DEFAULT_TRANSFORMERS_MODEL)
    })
  })

  describe('resolveAgentBrain', () => {
    it('keeps OpenRouter when key present and defaults to free router', () => {
      const result = resolveAgentBrain('openrouter', { openrouter: 'sk-or-key' })
      expect(result.brain).toBe('openrouter')
      expect(result.model).toBe(OPENROUTER_FREE_ROUTER)
    })

    it('falls back locally when OpenRouter key missing', () => {
      const result = resolveAgentBrain('openrouter', {})
      expect(result.brain).toBe('transformers')
      expect(result.fallbackNote).toContain('OpenRouter')
    })

    it('falls back when API key is whitespace', () => {
      const result = resolveAgentBrain('groq', { groq: '   ' })
      expect(result.brain).toBe('transformers')
    })

    it('falls back from WebLLM when WebGPU missing', () => {
      const result = resolveAgentBrain('local', {})
      expect(result.brain).toBe('transformers')
      expect(result.fallbackNote).toContain('WebGPU')
    })

    it('preserves custom model when brain available', () => {
      const result = resolveAgentBrain('transformers', {}, 'Xenova/custom')
      expect(result.model).toBe('Xenova/custom')
    })

    it('guides Groq users when key missing', () => {
      const result = resolveAgentBrain('groq', {})
      expect(result.fallbackNote).toContain('console.groq.com')
    })

    it('guides Gemini users when key missing', () => {
      const result = resolveAgentBrain('gemini', {})
      expect(result.fallbackNote).toContain('aistudio.google.com')
    })

    it('treats auto sentinel as default cloud model', () => {
      const groq = resolveAgentBrain('groq', { groq: 'gsk' }, AUTO_ROTATE_MODEL)
      expect(groq.brain).toBe('groq')
      expect(groq.model).toBeUndefined()
    })
  })

  describe('getDefaultAgentBrain', () => {
    it('prefers OpenRouter when key is saved', () => {
      const defaults = getDefaultAgentBrain({ openrouter: 'sk-or-key' })
      expect(defaults.brain).toBe('openrouter')
      expect(defaults.model).toBe(OPENROUTER_FREE_ROUTER)
    })

    it('uses Transformers when no cloud key', () => {
      const defaults = getDefaultAgentBrain({})
      expect(defaults.brain).toBe('transformers')
    })
  })

  describe('isBrainAvailable', () => {
    it('requires keys for cloud brains', () => {
      expect(isBrainAvailable('openrouter', {})).toBe(false)
      expect(isBrainAvailable('openrouter', { openrouter: 'sk' })).toBe(true)
      expect(isBrainAvailable('transformers', {})).toBe(true)
    })

    it('requires WebGPU for local WebLLM', () => {
      mockedWebGPU.mockReturnValue(true)
      expect(isBrainAvailable('local', {})).toBe(true)
    })

    it('returns false for unknown brain types', () => {
      expect(isBrainAvailable('unknown' as never, {})).toBe(false)
    })
  })

  describe('getBrainCostLabel', () => {
    it('labels OpenRouter as recommended', () => {
      expect(getBrainCostLabel('openrouter')).toBe('recommended')
    })

    it('labels WebLLM as slow fallback', () => {
      expect(getBrainCostLabel('local')).toContain('slow')
    })

    it('labels transformers as local', () => {
      expect(getBrainCostLabel('transformers')).toBe('local')
    })

    it('labels cloud tiers', () => {
      expect(getBrainCostLabel('groq')).toBe('free tier')
      expect(getBrainCostLabel('gemini')).toBe('free tier')
      expect(getBrainCostLabel('unknown' as never)).toBe('')
    })
  })
})
