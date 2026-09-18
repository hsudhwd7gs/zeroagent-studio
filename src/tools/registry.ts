import type { ApiKeys } from '../types'
import type { ToolNodeData } from '../types'
import { readLocalFile } from './fileReader'
import { scrapeWebPage } from './webScraper'
import { runSpeechTool, type SpeechMode } from './speech'
import { normalizeHttpUrl } from '../lib/validateUrl'
import { runTextTransform } from './textTransform'
import { runJsonTool } from './jsonTool'
import { runDatetimeTool } from './datetimeTool'
import { runCalculator } from './calculator'
import { runClipboardTool } from './clipboardTool'
import { runGroqTranscribe } from './groqTranscribe'
import { runGeminiVision } from './geminiVision'
import { runGeminiEmbeddings } from './geminiEmbeddings'
import { runOpenRouterEmbeddings } from './openrouterEmbeddings'
import { runCustomScript } from './customScript'
import { parseUrlTool } from './parseUrl'
import { fetchJsonTool } from './fetchJson'
import { runMultiInput } from './multiInput'
import { runTextOutputTool } from './textOutput'
import {
  isSpeechRecognitionAvailable,
  isSpeechSynthesisAvailable,
} from './speech'
import { isClipboardAvailable } from './clipboardTool'
import { MANIFEST_TOOLS } from './manifests/index'
import { manifestToToolDefinitions } from './registryHelpers'
import {
  type ToolDefinition,
  type ToolPaletteGroup,
  type ToolRequirement,
  type ToolType,
  type BrowserSubcategory,
  wrapLegacyRun,
  DEFAULT_TOOL_IO,
} from './registryTypes'
import { EMBEDDING_IN, EMBEDDING_OUT, TEXT_IN, TEXT_OUT } from '../lib/ports'

export type {
  ToolDefinition,
  ToolPaletteGroup,
  ToolRequirement,
  ToolContext,
  ToolType,
  BrowserSubcategory,
} from './registryTypes'

const CURATED_TOOLS: ToolDefinition[] = [
  {
    id: 'text-output',
    label: 'Text Output',
    description: 'Capture results — no Chat needed',
    icon: '📝',
    paletteGroup: 'browser',
    browserSubcategory: 'output',
    paletteDragType: 'tool-text-output',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input) => runTextOutputTool(input)),
  },
  {
    id: 'file-reader',
    label: 'File Reader',
    description: 'Pick a file — stays local',
    icon: '📄',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-file-reader',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: true, canRunWithoutInput: () => true },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async () => {
      const file = await readLocalFile()
      return `File: ${file.name}\nSize: ${file.size} bytes\n\n${file.content.slice(0, 4000)}`
    }),
  },
  {
    id: 'web-scraper',
    label: 'Web Scraper',
    description: 'Grab text from a page',
    icon: '🌐',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-web-scraper',
    requirement: { kind: 'none' },
    autoRun: {
      defaultEnabled: true,
      canRunWithoutInput: (config) => !!config.url?.trim(),
    },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => {
      const url = input.trim() || config.url || ''
      const normalized = normalizeHttpUrl(url)
      const scraped = await scrapeWebPage(normalized)
      return `Title: ${scraped.title}\nURL: ${scraped.url}\n\n${scraped.text}`
    }),
  },
  {
    id: 'speech',
    label: 'Speech',
    description: 'Listen or speak aloud',
    icon: '🎤',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-speech',
    requirement: { kind: 'none' },
    autoRun: {
      defaultEnabled: false,
      canRunWithoutInput: (config) => ((config.mode as SpeechMode) ?? 'stt') === 'stt',
    },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => {
      const mode = (config.mode as SpeechMode) ?? 'stt'
      const language = config.language ?? 'en-US'
      return runSpeechTool(input, { mode, language, text: input })
    }),
  },
  {
    id: 'text-transform',
    label: 'Text Transform',
    description: 'Trim, split, regex, replace',
    icon: '✂️',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-text-transform',
    requirement: { kind: 'none' },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextTransform(input, config)),
  },
  {
    id: 'json-tool',
    label: 'JSON Tool',
    description: 'Pretty-print or extract fields',
    icon: '{ }',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-json-tool',
    requirement: { kind: 'none' },
    inputs: [TEXT_IN],
    outputs: [TEXT_OUT],
    run: wrapLegacyRun(async (input, config) => runJsonTool(input, config)),
  },
  {
    id: 'datetime',
    label: 'Date & Time',
    description: 'Format now or parse dates',
    icon: '🕐',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-datetime',
    requirement: { kind: 'none' },
    autoRun: {
      defaultEnabled: true,
      canRunWithoutInput: (config) => (config.mode ?? 'format-now') === 'format-now',
    },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runDatetimeTool(input, config)),
  },
  {
    id: 'calculator',
    label: 'Calculator',
    description: 'Safe math on expressions',
    icon: '🔢',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-calculator',
    requirement: { kind: 'none' },
    autoRun: {
      defaultEnabled: true,
      canRunWithoutInput: (config) => !!config.expression?.trim(),
    },
    inputs: [{ ...TEXT_IN, label: 'Expression', dataType: 'text' }],
    outputs: [{ ...TEXT_OUT, label: 'Result', dataType: 'number' }],
    run: wrapLegacyRun(async (input, config) => runCalculator(input, config)),
  },
  {
    id: 'clipboard',
    label: 'Clipboard',
    description: 'Read or write clipboard text',
    icon: '📋',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-clipboard',
    requirement: { kind: 'browser', feature: 'clipboard' },
    autoRun: {
      defaultEnabled: true,
      canRunWithoutInput: (config) => (config.mode ?? 'read') === 'read',
    },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config, ctx) => runClipboardTool(input, config, ctx)),
  },
  {
    id: 'groq-transcribe',
    label: 'Groq Transcribe',
    description: 'Whisper speech-to-text via Groq',
    icon: '🎧',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-groq-transcribe',
    requirement: { kind: 'apiKey', provider: 'groq' },
    inputs: [{ id: 'in', label: 'Hint', direction: 'in', dataType: 'text', required: false }],
    outputs: [TEXT_OUT],
    run: wrapLegacyRun(async (_input, config, ctx) => runGroqTranscribe(ctx.apiKeys.groq ?? '', config)),
  },
  {
    id: 'gemini-vision',
    label: 'Gemini Vision',
    description: 'Describe an image with Gemini',
    icon: '🖼️',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-gemini-vision',
    requirement: { kind: 'apiKey', provider: 'gemini' },
    inputs: [TEXT_IN],
    outputs: [TEXT_OUT],
    run: wrapLegacyRun(async (input, config, ctx) =>
      runGeminiVision(ctx.apiKeys.gemini ?? '', input, config)
    ),
  },
  {
    id: 'gemini-embeddings',
    label: 'Gemini Embeddings',
    description: 'Semantic similarity with Gemini',
    icon: '🧬',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-gemini-embeddings',
    requirement: { kind: 'apiKey', provider: 'gemini' },
    inputs: [EMBEDDING_IN],
    outputs: [EMBEDDING_OUT],
    run: wrapLegacyRun(
      async (input, config, ctx) => runGeminiEmbeddings(ctx.apiKeys.gemini ?? '', input, config)
    ),
  },
  {
    id: 'openrouter-embeddings',
    label: 'OpenRouter Embeddings',
    description: 'Semantic similarity via OpenRouter',
    icon: '🔗',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-openrouter-embeddings',
    requirement: { kind: 'apiKey', provider: 'openrouter' },
    inputs: [EMBEDDING_IN],
    outputs: [EMBEDDING_OUT],
    run: wrapLegacyRun(async (input, config, ctx) =>
      runOpenRouterEmbeddings(ctx.apiKeys.openrouter ?? '', input, config)
    ),
  },
  {
    id: 'custom-script',
    label: 'Custom Script',
    description: 'Run sandboxed JS locally',
    icon: '⚡',
    paletteGroup: 'custom',
    paletteDragType: 'tool-custom-script',
    requirement: { kind: 'none' },
    inputs: [{ id: 'in', label: 'In', direction: 'in', dataType: 'any' }],
    outputs: [TEXT_OUT],
    run: wrapLegacyRun(async (input, config) => runCustomScript(input, config)),
  },
  {
    id: 'parse-url',
    label: 'Parse URL',
    description: 'Split URL into protocol, host, path, params',
    icon: '🔗',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-parse-url',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input) => parseUrlTool(input)),
  },
  {
    id: 'fetch-json',
    label: 'Fetch JSON',
    description: 'GET/POST JSON with custom method, headers & body',
    icon: '🌐',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-fetch-json',
    requirement: { kind: 'none' },
    autoRun: {
      defaultEnabled: false,
      canRunWithoutInput: (config) => !!config.url?.trim(),
    },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => fetchJsonTool(input, config)),
  },
  {
    id: 'multi-input',
    label: 'Multi-Input',
    description: 'Named fields → JSON object',
    icon: '🧾',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-multi-input',
    requirement: { kind: 'none' },
    autoRun: {
      defaultEnabled: false,
      canRunWithoutInput: (config) => !!config.fields?.trim(),
    },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runMultiInput(input, config)),
  },
]

export const TOOL_REGISTRY: ToolDefinition[] = [
  ...CURATED_TOOLS,
  ...manifestToToolDefinitions(MANIFEST_TOOLS),
]

const TOOL_MAP = new Map(TOOL_REGISTRY.map((t) => [t.id, t]))

export function getTool(id: ToolType): ToolDefinition {
  const tool = TOOL_MAP.get(id)
  if (!tool) throw new Error(`Unknown tool: ${id}`)
  return tool
}

export function listTools(): ToolDefinition[] {
  return [...TOOL_REGISTRY]
}

export function isBrowserFeatureAvailable(requirement: ToolRequirement & { kind: 'browser' }): boolean {
  if (requirement.feature === 'speechRecognition') return isSpeechRecognitionAvailable()
  if (requirement.feature === 'speechSynthesis') return isSpeechSynthesisAvailable()
  if (requirement.feature === 'clipboard') return isClipboardAvailable()
  return true
}

export function isSpeechModeAvailable(mode: SpeechMode | undefined): boolean {
  const resolved = mode ?? 'stt'
  if (resolved === 'tts') return isSpeechSynthesisAvailable()
  if (resolved === 'stt') return isSpeechRecognitionAvailable()
  return isSpeechRecognitionAvailable() && isSpeechSynthesisAvailable()
}

export function getSpeechModeRequirementMessage(mode: SpeechMode | undefined): string {
  const resolved = mode ?? 'stt'
  if (resolved === 'tts') {
    return isSpeechSynthesisAvailable()
      ? ''
      : 'Locked — speech synthesis is not available in this browser'
  }
  if (resolved === 'stt') {
    return isSpeechRecognitionAvailable()
      ? ''
      : 'Locked — speech recognition needs Chrome or Edge (Firefox is not supported)'
  }
  if (!isSpeechRecognitionAvailable()) {
    return 'Locked — speech recognition needs Chrome or Edge (Firefox is not supported)'
  }
  if (!isSpeechSynthesisAvailable()) {
    return 'Locked — speech synthesis is not available in this browser'
  }
  return ''
}

export function isToolAvailableForConfig(
  tool: ToolDefinition,
  apiKeys: ApiKeys,
  config?: Record<string, string>
): boolean {
  if (tool.id === 'speech') {
    return isSpeechModeAvailable((config?.mode as SpeechMode) ?? 'stt')
  }
  return isToolRequirementMet(tool.requirement, apiKeys)
}

export function getToolAvailabilityMessage(
  tool: ToolDefinition,
  apiKeys: ApiKeys,
  config?: Record<string, string>
): string {
  if (tool.id === 'speech') {
    return getSpeechModeRequirementMessage((config?.mode as SpeechMode) ?? 'stt')
  }
  if (!isToolRequirementMet(tool.requirement, apiKeys)) {
    return getToolRequirementMessage(tool.requirement)
  }
  return ''
}

export function isToolRequirementMet(
  requirement: ToolRequirement,
  apiKeys: ApiKeys
): boolean {
  if (requirement.kind === 'none') return true
  if (requirement.kind === 'apiKey') {
    return !!apiKeys[requirement.provider]?.trim()
  }
  return isBrowserFeatureAvailable(requirement)
}

export function getToolRequirementMessage(requirement: ToolRequirement): string {
  if (requirement.kind === 'none') return ''
  if (requirement.kind === 'apiKey') {
    const names: Record<keyof ApiKeys, string> = {
      openrouter: 'OpenRouter',
      groq: 'Groq',
      gemini: 'Gemini',
    }
    const steps: Record<keyof ApiKeys, string> = {
      openrouter: 'openrouter.ai/keys',
      groq: 'console.groq.com',
      gemini: 'aistudio.google.com',
    }
    const provider = requirement.provider
    return `Locked — open Privacy & keys and paste your ${names[provider]} API key (free at ${steps[provider]})`
  }
  if (requirement.feature === 'speechRecognition') {
    return 'Locked — speech recognition needs Chrome or Edge (Firefox is not supported)'
  }
  if (requirement.feature === 'clipboard') {
    return 'Locked — Clipboard API is not available in this browser'
  }
  return 'Locked — speech synthesis is not available in this browser'
}

export function getPaletteItemLock(
  paletteDragType: string,
  apiKeys: ApiKeys
): { locked: true; reason: string } | { locked: false } {
  const toolId = paletteDragTypeToToolId(paletteDragType)
  if (!toolId) return { locked: false }
  const tool = getTool(toolId)
  if (isToolRequirementMet(tool.requirement, apiKeys)) return { locked: false }
  return { locked: true, reason: getToolRequirementMessage(tool.requirement) }
}

export const BROWSER_SUBCATEGORY_LABELS: Record<BrowserSubcategory, string> = {
  output: 'Output',
  curated: 'Essentials',
  text: 'Text',
  encoding: 'Encoding & Hash',
  json: 'JSON',
  list: 'Lists',
  math: 'Math',
  date: 'Date & Time',
  validate: 'Validate',
  flow: 'Flow',
  regex: 'Regex',
  generate: 'Generate',
  html: 'HTML',
  markdown: 'Markdown',
  csv: 'CSV & Tables',
  compare: 'Compare',
}

export function getBrowserSubcategorySortIndex(sub?: BrowserSubcategory): number {
  return Object.keys(BROWSER_SUBCATEGORY_LABELS).indexOf(sub ?? 'curated')
}

export function listToolsForPalette(apiKeys: ApiKeys): ToolDefinition[] {
  const groupOrder: Record<ToolPaletteGroup, number> = { browser: 0, cloud: 1, custom: 2 }

  return [...TOOL_REGISTRY].sort((a, b) => {
    const groupDiff = groupOrder[a.paletteGroup] - groupOrder[b.paletteGroup]
    if (groupDiff !== 0) return groupDiff

    if (a.paletteGroup === 'cloud' && b.paletteGroup === 'cloud') {
      const aUnlocked = isToolRequirementMet(a.requirement, apiKeys)
      const bUnlocked = isToolRequirementMet(b.requirement, apiKeys)
      if (aUnlocked !== bUnlocked) return aUnlocked ? -1 : 1
    }

    if (a.paletteGroup === 'browser' && b.paletteGroup === 'browser') {
      const subDiff = getBrowserSubcategorySortIndex(a.browserSubcategory) - getBrowserSubcategorySortIndex(b.browserSubcategory)
      if (subDiff !== 0) return subDiff
    }

    return a.label.localeCompare(b.label)
  })
}

const PALETTE_TUTORIAL_ALIASES: Record<string, string> = {
  'web-scraper': 'palette-scraper',
  'file-reader': 'palette-file',
  speech: 'palette-speech',
}

export function getPaletteTutorialTarget(dragType: string): string {
  if (dragType === 'chat') return 'palette-chat'
  if (dragType === 'agent') return 'palette-agent'

  const toolId = paletteDragTypeToToolId(dragType)
  if (toolId) {
    return PALETTE_TUTORIAL_ALIASES[toolId] ?? `palette-${toolId}`
  }

  return dragType
}

/** Reverse map for quest steps — opens the right accordion before scroll. */
export function getPaletteDragTypeFromTutorialTarget(target: string | undefined): string | null {
  if (!target || target === 'palette') return null
  if (target === 'palette-chat') return 'chat'
  if (target === 'palette-agent') return 'agent'
  if (!target.startsWith('palette-')) return null

  for (const [toolId, alias] of Object.entries(PALETTE_TUTORIAL_ALIASES)) {
    if (alias === target) return `tool-${toolId}`
  }

  const slug = target.slice('palette-'.length)
  if (TOOL_REGISTRY.some((tool) => tool.id === slug)) return `tool-${slug}`
  return null
}

export function getToolBadge(
  tool: ToolDefinition,
  apiKeys: ApiKeys
): string {
  if (tool.requirement.kind === 'apiKey') {
    return isToolRequirementMet(tool.requirement, apiKeys) ? 'key ✓' : 'locked'
  }
  if (tool.paletteGroup === 'custom') return 'sandbox'
  return '$0'
}

export function paletteDragTypeToToolId(dragType: string): ToolType | null {
  if (!dragType.startsWith('tool-')) return null
  const tool = TOOL_REGISTRY.find((t) => t.paletteDragType === dragType)
  return tool?.id ?? null
}

export function getToolIcon(id: ToolType): string {
  return getTool(id).icon
}

export function getToolLabel(id: ToolType): string {
  return getTool(id).label
}

export function getToolCount(): number {
  return TOOL_REGISTRY.length
}

export function resolveToolAutoRun(data: ToolNodeData, tool: ToolDefinition): boolean {
  if (data.autoRun !== undefined) return data.autoRun
  return tool.autoRun?.defaultEnabled ?? false
}

function hasUpstreamInput(
  tool: ToolDefinition,
  portInputs: Record<string, import('../lib/ports').PortValue>
): boolean {
  return tool.inputs.some((p) => portInputs[p.id]?.value?.trim())
}

export function shouldSkipToolExecution(
  data: ToolNodeData,
  tool: ToolDefinition,
  portInputs: Record<string, import('../lib/ports').PortValue>
): { skip: boolean; reason?: string } {
  if (hasUpstreamInput(tool, portInputs)) {
    return { skip: false }
  }

  const config = data.config ?? {}
  const canRunWithoutInput = tool.autoRun?.canRunWithoutInput(config) ?? false

  if (!canRunWithoutInput) {
    if (tool.id === 'text-output') {
      return { skip: true, reason: 'Skipped — no input to capture' }
    }
    if (tool.id === 'speech') {
      return {
        skip: true,
        reason: 'Skipped — wire Agent Out or upstream text into In for speak mode',
      }
    }
    return { skip: false }
  }

  if (resolveToolAutoRun(data, tool)) {
    return { skip: false }
  }

  return { skip: true, reason: 'Skipped — auto-run disabled and no upstream input' }
}

/** Tool can produce output without an upstream wire (workflow starter). */
export function canToolRunWithoutUpstreamInput(
  tool: ToolDefinition,
  config: Record<string, string> = {}
): boolean {
  if (tool.autoRun?.canRunWithoutInput(config)) {
    return true
  }
  if (tool.engine === 'generate' || tool.engine === 'date') {
    return true
  }
  return false
}
