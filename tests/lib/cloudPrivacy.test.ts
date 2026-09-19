import { describe, it, expect } from 'vitest'
import {
  CLOUD_PROVIDER_GUIDES,
  getProviderGuide,
  BRAINWIRE_PRIVACY_TRUTH,
} from '../../src/lib/cloudPrivacy'

describe('cloudPrivacy', () => {
  it('lists all three cloud providers with official links', () => {
    expect(CLOUD_PROVIDER_GUIDES.map((g) => g.id)).toEqual(['openrouter', 'groq', 'gemini'])
    for (const guide of CLOUD_PROVIDER_GUIDES) {
      expect(guide.whatWeSend.length).toBeGreaterThan(0)
      expect(guide.risks.length).toBeGreaterThan(0)
      expect(guide.settingsToCheck.every((l) => l.url.startsWith('https://'))).toBe(true)
      expect(guide.policyLinks.every((l) => l.url.startsWith('https://'))).toBe(true)
    }
  })

  it('returns guide by provider id', () => {
    const groq = getProviderGuide('groq')
    expect(groq.name).toBe('Groq')
  })

  it('throws for unknown provider', () => {
    expect(() => getProviderGuide('unknown' as 'groq')).toThrow('Unknown provider')
  })

  it('documents chat send behavior honestly', () => {
    expect(BRAINWIRE_PRIVACY_TRUTH.chatWarning).toMatch(/press send/i)
    expect(BRAINWIRE_PRIVACY_TRUTH.bullets.some((b) => /no servers/i.test(b))).toBe(true)
    expect(BRAINWIRE_PRIVACY_TRUTH.bullets.some((b) => /analytics/i.test(b))).toBe(true)
  })
})
