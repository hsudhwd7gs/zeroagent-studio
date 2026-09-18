import { describe, it, expect, vi } from 'vitest'
import {
  getTool,
  listTools,
  isToolRequirementMet,
  getToolRequirementMessage,
  isSpeechModeAvailable,
  isToolAvailableForConfig,
  getToolAvailabilityMessage,
  isBrowserFeatureAvailable,
  getPaletteItemLock,
  getToolBadge,
  getPaletteTutorialTarget,
  getPaletteDragTypeFromTutorialTarget,
  listToolsForPalette,
  paletteDragTypeToToolId,
  TOOL_REGISTRY,
  getBrowserSubcategorySortIndex,
  getSpeechModeRequirementMessage,
} from '../../src/tools/registry'

describe('tool registry', () => {
  it('lists all registered tools', () => {
    expect(listTools().length).toBe(TOOL_REGISTRY.length)
    expect(TOOL_REGISTRY.length).toMatchInlineSnapshot(`241`)
    expect(getTool('web-scraper').label).toBe('Web Scraper')
  })

  it('throws for unknown tool id', () => {
    expect(() => getTool('missing' as never)).toThrow(/Unknown tool/)
  })

  it('checks API key requirements', () => {
    const groq = getTool('groq-transcribe')
    expect(isToolRequirementMet(groq.requirement, {})).toBe(false)
    expect(isToolRequirementMet(groq.requirement, { groq: 'gsk' })).toBe(true)
    expect(getToolRequirementMessage(groq.requirement)).toContain('Groq')
    expect(getToolRequirementMessage(groq.requirement)).toContain('Privacy & keys')
  })

  it('locks palette cloud tools without keys', () => {
    const lock = getPaletteItemLock('tool-groq-transcribe', {})
    expect(lock.locked).toBe(true)
    if (lock.locked) expect(lock.reason).toContain('Groq')
    expect(getPaletteItemLock('tool-web-scraper', {}).locked).toBe(false)
    expect(getPaletteItemLock('chat', {}).locked).toBe(false)
  })

  it('maps palette drag types', () => {
    expect(paletteDragTypeToToolId('tool-web-scraper')).toBe('web-scraper')
    expect(paletteDragTypeToToolId('chat')).toBeNull()
  })

  it('returns friendly palette tutorial targets', () => {
    expect(getPaletteTutorialTarget('chat')).toBe('palette-chat')
    expect(getPaletteTutorialTarget('agent')).toBe('palette-agent')
    expect(getPaletteTutorialTarget('tool-web-scraper')).toBe('palette-scraper')
    expect(getPaletteTutorialTarget('tool-json-tool')).toBe('palette-json-tool')
    expect(getPaletteTutorialTarget('tool-custom-script')).toBe('palette-custom-script')
    expect(getPaletteTutorialTarget('unknown-drag')).toBe('unknown-drag')
    expect(getPaletteDragTypeFromTutorialTarget('palette-scraper')).toBe('tool-web-scraper')
    expect(getPaletteDragTypeFromTutorialTarget('palette-json-tool')).toBe('tool-json-tool')
    expect(getPaletteDragTypeFromTutorialTarget('palette-chat')).toBe('chat')
    expect(getPaletteDragTypeFromTutorialTarget('palette-agent')).toBe('agent')
    expect(getPaletteDragTypeFromTutorialTarget('palette')).toBeNull()
    expect(getPaletteDragTypeFromTutorialTarget(undefined)).toBeNull()
    expect(getPaletteDragTypeFromTutorialTarget('palette-not-real')).toBeNull()
    expect(getPaletteDragTypeFromTutorialTarget('chat-input')).toBeNull()
  })

  it('sorts palette tools with unlocked cloud tools first', () => {
    const partial = listToolsForPalette({ groq: 'gsk_test' })
    const groqIdx = partial.findIndex((t) => t.id === 'groq-transcribe')
    const geminiIdx = partial.findIndex((t) => t.id === 'gemini-vision')
    expect(groqIdx).toBeGreaterThan(-1)
    expect(geminiIdx).toBeGreaterThan(groqIdx)

    const allKeys = listToolsForPalette({ groq: 'g', gemini: 'g', openrouter: 'o' })
    const cloudStart = allKeys.findIndex((t) => t.paletteGroup === 'cloud')
    const customStart = allKeys.findIndex((t) => t.paletteGroup === 'custom')
    expect(cloudStart).toBeGreaterThan(0)
    expect(customStart).toBeGreaterThan(cloudStart)

    const geminiOnly = listToolsForPalette({ gemini: 'gem-key' })
    const cloudOnly = geminiOnly.filter((t) => t.paletteGroup === 'cloud').map((t) => t.id)
    expect(cloudOnly.indexOf('gemini-embeddings')).toBeLessThan(cloudOnly.indexOf('groq-transcribe'))

    const browserTools = listToolsForPalette({})
    const textIdx = browserTools.findIndex((t) => t.id === 'trim-text')
    const encIdx = browserTools.findIndex((t) => t.id === 'base64-encode')
    expect(textIdx).toBeGreaterThan(-1)
    expect(encIdx).toBeGreaterThan(textIdx)
  })

  it('sorts output subcategory before curated in browser palette', () => {
    const browserTools = listToolsForPalette({})
    const textOutputIdx = browserTools.findIndex((t) => t.id === 'text-output')
    const trimIdx = browserTools.findIndex((t) => t.id === 'trim-text')
    expect(textOutputIdx).toBeGreaterThan(-1)
    expect(trimIdx).toBeGreaterThan(-1)
    expect(textOutputIdx).toBeLessThan(trimIdx)
    expect(getBrowserSubcategorySortIndex('output')).toBeLessThan(
      getBrowserSubcategorySortIndex('curated')
    )
  })

  it('treats missing browser subcategory as curated when sorting', () => {
    expect(getBrowserSubcategorySortIndex('output')).toBe(0)
    expect(getBrowserSubcategorySortIndex(undefined)).toBe(1)
    expect(getBrowserSubcategorySortIndex('encoding')).toBeGreaterThan(1)
  })

  it('returns badges for cloud and custom tools', () => {
    const cloud = getTool('gemini-vision')
    expect(getToolBadge(cloud, {})).toBe('locked')
    expect(getToolBadge(cloud, { gemini: 'key' })).toBe('key ✓')
    expect(getToolBadge(getTool('custom-script'), {})).toBe('sandbox')
    expect(getToolBadge(getTool('file-reader'), {})).toBe('$0')
  })

  it('covers browser requirement messages', () => {
    expect(getToolRequirementMessage({ kind: 'browser', feature: 'speechRecognition' })).toContain(
      'Chrome'
    )
    expect(getToolRequirementMessage({ kind: 'browser', feature: 'speechSynthesis' })).toContain(
      'synthesis'
    )
    expect(getToolRequirementMessage({ kind: 'browser', feature: 'clipboard' })).toContain(
      'Clipboard'
    )
  })

  it('checks speech availability per mode instead of always requiring STT', () => {
    const speech = getTool('speech')
    expect(speech.requirement.kind).toBe('none')
    expect(isToolAvailableForConfig(speech, {}, { mode: 'tts' })).toBe(
      isSpeechModeAvailable('tts')
    )
    if (!isSpeechModeAvailable('stt')) {
      expect(getToolAvailabilityMessage(speech, {}, { mode: 'stt' })).toContain('recognition')
    }
    expect(getToolAvailabilityMessage(getTool('web-scraper'), {}, {})).toBe('')
    expect(isSpeechModeAvailable('both')).toBe(
      isSpeechModeAvailable('stt') && isSpeechModeAvailable('tts')
    )
    expect(isSpeechModeAvailable(undefined)).toBe(isSpeechModeAvailable('stt'))
    class MockRecognition {}
    vi.stubGlobal('window', {
      SpeechRecognition: MockRecognition,
      speechSynthesis: { speak: vi.fn() },
    } as unknown as Window)
    expect(isSpeechModeAvailable('both')).toBe(true)
    expect(getToolAvailabilityMessage(getTool('speech'), {}, { mode: 'tts' })).toBe('')
    vi.unstubAllGlobals()
  })

  it('describes missing browser speech features per mode', () => {
    vi.stubGlobal('window', {} as Window)
    expect(getSpeechModeRequirementMessage('tts')).toContain('synthesis')
    expect(getSpeechModeRequirementMessage('stt')).toContain('recognition')
    expect(getSpeechModeRequirementMessage('both')).toContain('recognition')
    vi.unstubAllGlobals()
  })

  it('describes missing synthesis in both mode when recognition exists', () => {
    class MockRecognition {}
    vi.stubGlobal('window', { SpeechRecognition: MockRecognition } as unknown as Window)
    expect(getSpeechModeRequirementMessage('both')).toContain('synthesis')
    vi.unstubAllGlobals()
  })

  it('returns empty requirement message when both speech APIs exist', () => {
    class MockRecognition {}
    vi.stubGlobal('window', {
      SpeechRecognition: MockRecognition,
      speechSynthesis: { speak: vi.fn() },
    } as unknown as Window)
    expect(getSpeechModeRequirementMessage('both')).toBe('')
    expect(getSpeechModeRequirementMessage('tts')).toBe('')
    expect(getSpeechModeRequirementMessage('stt')).toBe('')
    expect(getSpeechModeRequirementMessage(undefined)).toBe('')
    expect(getToolAvailabilityMessage(getTool('speech'), {}, undefined)).toBe('')
    vi.unstubAllGlobals()
  })

  it('treats unknown browser feature flags as available', () => {
    expect(
      isBrowserFeatureAvailable({ kind: 'browser', feature: 'other' as 'speechRecognition' })
    ).toBe(true)
    expect(
      isToolRequirementMet({ kind: 'browser', feature: 'other' as 'speechRecognition' }, {})
    ).toBe(true)
  })
})
