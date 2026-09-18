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
import { runTextOutputTool } from './textOutput'
import { runMultiInput } from './multiInput'
import { runStringTemplate } from './stringTemplate'
import { runArrayFilter } from './arrayFilter'
import { runArrayMap } from './arrayMap'
import { runArraySort } from './arraySort'
import { runArrayDedupe } from './arrayDedupe'
import { runArrayGroupBy } from './arrayGroupBy'
import { runArrayChunk } from './arrayChunk'
import { runArraySlice } from './arraySlice'
import { runLoopOver } from './loopOver'
import { runBatchSplit } from './batchSplit'
import { runJsonPath } from './jsonPath'
import { runJsonMerge } from './jsonMerge'
import { runJsonFlatten } from './jsonFlatten'
import { runJsonPick } from './jsonPick'
import { runJsonDiff } from './jsonDiff'
import { runCsvExport } from './csvExport'
import { runCsvToJson } from './csvToJson'
import { runTextChunk } from './textChunk'
import { runTextTruncate } from './textTruncate'
import { runTextExtract } from './textExtract'
import { runTextSplit } from './textSplit'
import { runTextJoin } from './textJoin'
import { runRegexExtract } from './regexExtract'
import { runHashText } from './hashText'
import { runBase64Codec } from './base64Codec'
import { runRetryWithBackoff } from './retryWithBackoff'
import { runVariableStore } from './variableStore'
import { runCache } from './cache'
import { runTimer } from './timer'
import { runWebhookSend } from './webhookSend'
import { runEmailSend } from './emailSend'
import { runGoogleSheets } from './googleSheets'
import { runGoogleAnalytics } from './googleAnalytics'
import { runYoutubeAnalytics } from './youtubeAnalytics'
import { runTelegramSend } from './telegramSend'
import { runNotionApi } from './notionApi'
import { runApiKeyManager } from './apiKeyManager'
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
  {
    id: 'string-template',
    label: 'String Template',
    description: 'Replace {{vars}} in a template',
    icon: '📝',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-string-template',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runStringTemplate(input, config)),
  },
  {
    id: 'array-filter',
    label: 'Array Filter',
    description: 'Keep items matching a condition',
    icon: '🔍',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-filter',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArrayFilter(input, config)),
  },
  {
    id: 'array-map',
    label: 'Array Map',
    description: 'Transform each item in a list',
    icon: '🗺️',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-map',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArrayMap(input, config)),
  },
  {
    id: 'array-sort',
    label: 'Array Sort',
    description: 'Sort a list by key',
    icon: '📊',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-sort',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArraySort(input, config)),
  },
  {
    id: 'array-dedupe',
    label: 'Array Dedupe',
    description: 'Remove duplicate items',
    icon: '🧹',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-dedupe',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArrayDedupe(input, config)),
  },
  {
    id: 'array-group-by',
    label: 'Array Group By',
    description: 'Group items by a key',
    icon: '🗂️',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-group-by',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArrayGroupBy(input, config)),
  },
  {
    id: 'array-chunk',
    label: 'Array Chunk',
    description: 'Split into N-sized chunks',
    icon: '🧩',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-chunk',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArrayChunk(input, config)),
  },
  {
    id: 'array-slice',
    label: 'Array Slice',
    description: 'Take first N / last N / range',
    icon: '✂️',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-array-slice',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runArraySlice(input, config)),
  },
  {
    id: 'loop-over',
    label: 'Loop Over',
    description: 'Apply a transform to each array item',
    icon: '🔁',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-loop-over',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runLoopOver(input, config)),
  },
  {
    id: 'batch-split',
    label: 'Batch Split',
    description: 'Split into N-sized batches',
    icon: '🧩',
    paletteGroup: 'browser',
    browserSubcategory: 'list',
    paletteDragType: 'tool-batch-split',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runBatchSplit(input, config)),
  },
  {
    id: 'json-path',
    label: 'JSON Path',
    description: 'Extract value by dot/bracket path',
    icon: '🔎',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    paletteDragType: 'tool-json-path',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runJsonPath(input, config)),
  },
  {
    id: 'json-merge',
    label: 'JSON Merge',
    description: 'Deep merge two JSON objects',
    icon: '🔗',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    paletteDragType: 'tool-json-merge',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runJsonMerge(input, config)),
  },
  {
    id: 'json-flatten',
    label: 'JSON Flatten',
    description: 'Flatten nested JSON to dot keys',
    icon: '📋',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    paletteDragType: 'tool-json-flatten',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runJsonFlatten(input, config)),
  },
  {
    id: 'json-pick',
    label: 'JSON Pick',
    description: 'Keep only specified keys',
    icon: '🎁',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    paletteDragType: 'tool-json-pick',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runJsonPick(input, config)),
  },
  {
    id: 'json-diff',
    label: 'JSON Diff',
    description: 'Compare two JSON values',
    icon: '⚖️',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    paletteDragType: 'tool-json-diff',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runJsonDiff(input, config)),
  },
  {
    id: 'csv-export',
    label: 'CSV Export',
    description: 'Convert JSON array to CSV',
    icon: '📄',
    paletteGroup: 'browser',
    browserSubcategory: 'csv',
    paletteDragType: 'tool-csv-export',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runCsvExport(input, config)),
  },
  {
    id: 'csv-to-json',
    label: 'CSV to JSON',
    description: 'Parse CSV to JSON array',
    icon: '📊',
    paletteGroup: 'browser',
    browserSubcategory: 'csv',
    paletteDragType: 'tool-csv-to-json',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runCsvToJson(input, config)),
  },
  {
    id: 'text-chunk',
    label: 'Text Chunk',
    description: 'Split text into N-char chunks',
    icon: '✂️',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-text-chunk',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextChunk(input, config)),
  },
  {
    id: 'text-truncate',
    label: 'Text Truncate',
    description: 'Truncate to N characters',
    icon: '✂️',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-text-truncate',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextTruncate(input, config)),
  },
  {
    id: 'text-extract',
    label: 'Text Extract',
    description: 'Pull emails, URLs, phones, numbers',
    icon: '🔍',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-text-extract',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextExtract(input, config)),
  },
  {
    id: 'text-split',
    label: 'Text Split',
    description: 'Split text into a JSON array',
    icon: '✂️',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-text-split',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextSplit(input, config)),
  },
  {
    id: 'text-join',
    label: 'Text Join',
    description: 'Join a JSON array into text',
    icon: '🔗',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-text-join',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextJoin(input, config)),
  },
  {
    id: 'regex-extract',
    label: 'Regex Extract',
    description: 'Match patterns and capture groups',
    icon: '🎯',
    paletteGroup: 'browser',
    browserSubcategory: 'regex',
    paletteDragType: 'tool-regex-extract',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runRegexExtract(input, config)),
  },
  {
    id: 'hash-text',
    label: 'Hash',
    description: 'SHA-256 / SHA-1 / SHA-512',
    icon: '#️⃣',
    paletteGroup: 'browser',
    browserSubcategory: 'encoding',
    paletteDragType: 'tool-hash-text',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runHashText(input, config)),
  },
  {
    id: 'base64-codec',
    label: 'Base64',
    description: 'Encode / decode base64',
    icon: '🔐',
    paletteGroup: 'browser',
    browserSubcategory: 'encoding',
    paletteDragType: 'tool-base64-codec',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runBase64Codec(input, config)),
  },
  {
    id: 'retry-backoff',
    label: 'Retry with Backoff',
    description: 'Fetch with automatic retries',
    icon: '🔄',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-retry-backoff',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (config) => !!config.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runRetryWithBackoff(input, config)),
  },
  {
    id: 'variable-store',
    label: 'Variable Store',
    description: 'Shared key-value state',
    icon: '💾',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-variable-store',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runVariableStore(input, config)),
  },
  {
    id: 'cache',
    label: 'Cache',
    description: 'Key-value store with TTL',
    icon: '🗄️',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-cache',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runCache(input, config)),
  },
  {
    id: 'timer',
    label: 'Timer',
    description: 'Measure elapsed time',
    icon: '⏱️',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-timer',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTimer(input, config)),
  },
  {
    id: 'webhook-send',
    label: 'Webhook Send',
    description: 'POST input to any URL',
    icon: '📤',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-webhook-send',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (config) => !!config.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runWebhookSend(input, config)),
  },
  {
    id: 'email-send',
    label: 'Email Send',
    description: 'Send via Resend or Postmark',
    icon: '📧',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-email-send',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runEmailSend(input, config)),
  },
  {
    id: 'google-sheets',
    label: 'Google Sheets',
    description: 'Append rows to a Sheet',
    icon: '📊',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-google-sheets',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (config) => !!config.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runGoogleSheets(input, config)),
  },
  {
    id: 'google-analytics',
    label: 'Google Analytics',
    description: 'Query GA4 data',
    icon: '📈',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-google-analytics',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runGoogleAnalytics(input, config)),
  },
  {
    id: 'youtube-analytics',
    label: 'YouTube Analytics',
    description: 'Video stats via YouTube API',
    icon: '▶️',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-youtube-analytics',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (config) => !!config.apiKey?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runYoutubeAnalytics(input, config)),
  },
  {
    id: 'telegram-send',
    label: 'Telegram Send',
    description: 'Send via Telegram bot',
    icon: '✈️',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-telegram-send',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTelegramSend(input, config)),
  },
  {
    id: 'notion-api',
    label: 'Notion API',
    description: 'Create or query Notion pages',
    icon: '📓',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-notion-api',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runNotionApi(input, config)),
  },
  {
    id: 'api-key-manager',
    label: 'API Key Manager',
    description: 'Add/update/delete API keys in the Worker',
    icon: '🔑',
    paletteGroup: 'custom',
    paletteDragType: 'tool-api-key-manager',
    requirement: { kind: 'none' },
    inputs: [{ id: 'in', label: 'In', direction: 'in', dataType: 'text', required: false }],
    outputs: [TEXT_OUT],
    run: wrapLegacyRun(async (input, config) => runApiKeyManager(input, config)),
  },
]

export const TOOL_REGISTRY: ToolDefinition[] = [
  ...CURATED_TOOLS,
  ...manifestToToolDefinitions(MANIFEST_TOOLS),
]

const TOOL_MAP = new Map(TOOL_REGISTRY.map((t) => [t.id, t]))

export function getTool(id: ToolType): ToolDefinition {
  const tool = TOOL_MAP.get(id)
  if (!tool) {
    const cause = new Error(`Unknown tool: ${id}`)
    throw new Error(`Unknown tool: ${id}`, { cause })
  }
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
