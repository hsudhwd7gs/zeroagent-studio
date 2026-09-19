import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTool,
  listToolsForPalette,
  isBrowserFeatureAvailable,
  getToolRequirementMessage,
  getToolBadge,
  getToolIcon,
  getToolLabel,
  paletteDragTypeToToolId,
} from '../../src/tools/registry'

vi.mock('../../src/tools/fileReader', () => ({
  readLocalFile: vi.fn(async () => ({
    name: 'doc.txt',
    content: 'hello file',
    size: 5,
    type: 'text/plain',
  })),
}))

vi.mock('../../src/tools/webScraper', () => ({
  scrapeWebPage: vi.fn(async () => ({
    url: 'https://x.com',
    title: 'Title',
    text: 'body',
    links: [],
  })),
}))

vi.mock('../../src/tools/speech', () => ({
  runSpeechTool: vi.fn(async () => 'spoken'),
  isSpeechRecognitionAvailable: vi.fn(() => true),
  isSpeechSynthesisAvailable: vi.fn(() => false),
}))

vi.mock('../../src/tools/clipboardTool', () => ({
  isClipboardAvailable: vi.fn(() => true),
  runClipboardTool: vi.fn(async () => 'clip'),
}))

vi.mock('../../src/tools/groqTranscribe', () => ({
  runGroqTranscribe: vi.fn(async () => 'transcript'),
}))

vi.mock('../../src/tools/geminiVision', () => ({
  runGeminiVision: vi.fn(async () => 'vision'),
}))

vi.mock('../../src/tools/geminiEmbeddings', () => ({
  runGeminiEmbeddings: vi.fn(async () => 'embed'),
}))

vi.mock('../../src/tools/openrouterEmbeddings', () => ({
  runOpenRouterEmbeddings: vi.fn(async () => 'or-embed'),
}))

vi.mock('../../src/tools/customScript', () => ({
  runCustomScript: vi.fn(async () => 'script-out'),
}))

const ctx = { apiKeys: { groq: 'g', gemini: 'gem', openrouter: 'or' }, log: vi.fn() }

function textInput(value: string) {
  return { in: { type: 'text' as const, value } }
}

describe('registry tool runners', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs each registered tool via run()', async () => {
    const ids = [
      'file-reader',
      'web-scraper',
      'speech',
      'text-transform',
      'json-tool',
      'datetime',
      'calculator',
      'clipboard',
      'groq-transcribe',
      'gemini-vision',
      'gemini-embeddings',
      'openrouter-embeddings',
      'custom-script',
      'parse-url',
      'fetch-json',
    ] as const

    for (const id of ids) {
      const tool = getTool(id)
      const config: Record<string, string> = {}
      if (id === 'json-tool') config.mode = 'pretty'
      if (id === 'text-transform') config.mode = 'trim'
      if (id === 'datetime') config.mode = 'format-now'
      if (id === 'calculator') config.expression = '1+1'
      if (id === 'clipboard') config.mode = 'read'
      if (id === 'speech') config.mode = 'stt'
      if (id === 'fetch-json') {
        config.url = 'https://api.example.com/data'
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => ({
            ok: true,
            status: 200,
            statusText: 'OK',
            text: async () => '{"ok":true}',
          }))
        )
      }
      const input =
        id === 'json-tool'
          ? '{"a":1}'
          : id === 'parse-url'
            ? 'https://example.com/path?q=1'
            : 'input'
      const result = await tool.run(textInput(input), config, ctx)
      const out = result.out?.value ?? Object.values(result)[0]?.value
      expect(typeof out).toBe('string')
      if (id === 'fetch-json') vi.unstubAllGlobals()
    }
  })

  it('parse-url autoRun never runs without input', () => {
    const tool = getTool('parse-url')
    expect(tool.autoRun?.defaultEnabled).toBe(false)
    expect(tool.autoRun?.canRunWithoutInput({})).toBe(false)
  })

  it('fetch-json can run without input when URL is configured', () => {
    const tool = getTool('fetch-json')
    expect(tool.autoRun?.canRunWithoutInput({ url: 'https://example.com' })).toBe(true)
    expect(tool.autoRun?.canRunWithoutInput({})).toBe(false)
  })

  it('runs cloud tools with empty key fallbacks in ctx', async () => {
    const log = vi.fn()
    const emptyCtx = { apiKeys: {}, log }
    await getTool('groq-transcribe').run(textInput(''), {}, emptyCtx)
    await getTool('gemini-vision').run(textInput('q'), {}, emptyCtx)
    await getTool('gemini-embeddings').run(textInput('text'), { reference: 'x' }, emptyCtx)
    await getTool('openrouter-embeddings').run(textInput('text'), { reference: 'x' }, emptyCtx)
    expect(log).not.toHaveBeenCalled()
  })

  it('web-scraper uses config url when input empty', async () => {
    const { scrapeWebPage } = await import('../../src/tools/webScraper')
    const tool = getTool('web-scraper')
    await tool.run(textInput(''), { url: 'example.com' }, ctx)
    expect(scrapeWebPage).toHaveBeenCalledWith('https://example.com/')
  })

  it('exposes palette helpers and browser requirements', () => {
    expect(listToolsForPalette({}).length).toBeGreaterThanOrEqual(100)
    expect(getToolIcon('speech')).toBe('🎤')
    expect(getToolLabel('speech')).toBe('Speech')
    expect(paletteDragTypeToToolId('tool-unknown')).toBeNull()
    expect(getToolBadge(getTool('file-reader'), {})).toBe('free')

    const speechReq = { kind: 'browser' as const, feature: 'speechRecognition' as const }
    expect(isBrowserFeatureAvailable(speechReq)).toBe(true)
    expect(getToolRequirementMessage({ kind: 'browser', feature: 'speechSynthesis' })).toContain(
      'synthesis'
    )
    expect(getToolRequirementMessage({ kind: 'browser', feature: 'clipboard' })).toContain(
      'Clipboard'
    )
    expect(getToolRequirementMessage({ kind: 'none' })).toBe('')
  })
})
