import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listBrainOptions,
  getBrainSetupMessage,
  getAgentBrainBadgeLabel,
} from '../../src/lib/brainSetup'
import * as brainResolver from '../../src/lib/brainResolver'
import * as webllm from '../../src/engines/webllm'

vi.mock('../../src/engines/webllm', () => ({
  isWebGPUAvailable: vi.fn(),
}))

const mockedWebGPU = vi.mocked(webllm.isWebGPUAvailable)

describe('brainSetup', () => {
  beforeEach(() => {
    mockedWebGPU.mockReturnValue(false)
  })

  it('marks cloud brains locked without keys', () => {
    const options = listBrainOptions({})
    const openrouter = options.find((o) => o.brain === 'openrouter')!
    const transformers = options.find((o) => o.brain === 'transformers')!
    expect(openrouter.available).toBe(false)
    expect(openrouter.setupMessage).toContain('openrouter.ai')
    expect(transformers.available).toBe(true)
    expect(transformers.setupMessage).toBeNull()
  })

  it('unlocks cloud brains when keys are saved', () => {
    const options = listBrainOptions({
      openrouter: 'sk-or',
      groq: 'gsk',
      gemini: 'AIza',
    })
    expect(options.filter((o) => !o.available).map((o) => o.brain)).toEqual(['local'])
  })

  it('explains WebLLM lock when WebGPU is missing', () => {
    const msg = getBrainSetupMessage('local', {})
    expect(msg).toContain('WebGPU')
  })

  it('allows WebLLM when WebGPU is available', () => {
    mockedWebGPU.mockReturnValue(true)
    expect(getBrainSetupMessage('local', {})).toBeNull()
  })

  it('returns provider-specific setup hints', () => {
    expect(getBrainSetupMessage('groq', {})).toContain('console.groq.com')
    expect(getBrainSetupMessage('gemini', {})).toContain('aistudio.google.com')
  })

  it('labels agent badges and shows lock without keys', () => {
    expect(getAgentBrainBadgeLabel('openrouter', {}).locked).toBe(true)
    expect(getAgentBrainBadgeLabel('openrouter', {}).text).toContain('🔒')
    expect(getAgentBrainBadgeLabel('openrouter', { openrouter: 'sk' }).text).toBe('OR auto')
    expect(
      getAgentBrainBadgeLabel('openrouter', { openrouter: 'sk' }, 'meta-llama/foo:free').text
    ).toBe('OR :free')
    expect(getAgentBrainBadgeLabel('transformers', {}).text).toBe('Local')
    expect(getAgentBrainBadgeLabel('groq', { groq: 'gsk' }).text).toBe('Groq free')
    expect(getAgentBrainBadgeLabel('gemini', { gemini: 'AIza' }).text).toBe('Gemini free')
    mockedWebGPU.mockReturnValue(true)
    expect(getAgentBrainBadgeLabel('local', {}, 'model').text).toBe('WebLLM')
    expect(getAgentBrainBadgeLabel('unknown' as 'groq', {}).text).toContain('unknown')
  })

  it('covers unknown brain fallback message', () => {
    expect(getBrainSetupMessage('unknown' as 'groq', {})).toContain('not available')
  })

  it('returns raw brain id when marked available but not a known engine', () => {
    vi.spyOn(brainResolver, 'isBrainAvailable').mockReturnValue(true)
    expect(getAgentBrainBadgeLabel('mystery' as 'groq', {}).text).toBe('mystery')
    vi.restoreAllMocks()
  })
})
