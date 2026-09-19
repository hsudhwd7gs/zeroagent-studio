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
import { runPython } from './pythonRunner'
import { runAudioTool } from './audioTool'
import { runBrowserLogin } from './browserLogin'
import { runChartJs } from './chartJsTool'
import { runD3Chart } from './d3Chart'
import { runDiscord } from './discordTool'
import { runFFmpeg } from './ffmpegTool'
import { runFFprobe } from './ffprobeTool'
import { runFileDownload } from './fileDownload'
import { runFusionMeta } from './fusionMeta'
import { runImageResize } from './imageResize'
import { runLanguageDetect } from './languageDetect'
import { runLongTextGen } from './longTextGen'
import { runOcr } from './ocrTool'
import { runPdfTool } from './pdfTool'
import { runPhoton } from './photonTool'
import { runRustLib } from './rustLib'
import { runSpellCheck } from './spellCheck'
import { runTextDiff } from './textDiff'
import { runTfjs } from './tfjsTool'
import { runThumbnailGen } from './thumbnailGen'
import { runWasm } from './wasmRunner'
import { runWebAudio } from './webAudioTool'
import { runYamlTool } from './yamlTool'
import { runYtDlp } from './ytdlpTool'
import { runKaggleNotebook } from './kaggleNotebook'
import { runColabNotebook } from './colabNotebook'
import { runAiVideoGen } from './aiVideoGen'
import { runAiAudioGen } from './aiAudioGen'
import { runAiImageGen } from './aiImageGen'
import { runPromptBucket } from './promptBucket'
import { runCarouselGen } from './carouselGen'
import { runStockFootage } from './stockFootage'
import { runImageEdit } from './imageEdit'
import { runTrendpy } from './trendpy'
import { runRssReader } from './rssReader'
import { runHackernews } from './hackernews'
import { runRedditScraper } from './redditScraper'
import { runOpenaiChat } from './openaiChat'
import { runAnthropicChat } from './anthropicChat'
import { runMistralChat } from './mistralChat'
import { runCohereChat } from './cohereChat'
import { runWebSearch } from './webSearch'
import { runWikipediaSearch } from './wikipediaSearch'
import { runGithubApi } from './githubApi'
import { runCurrencyConvert } from './currencyConvert'
import { runWeather } from './weather'
import { runIpLookup } from './ipLookup'
import { runQrCode } from './qrCode'
import { runBarcodeGen } from './barcodeGen'
import { runTextToSpeechCloud } from './textToSpeechCloud'
import { runSpeechToTextCloud } from './speechToTextCloud'
import { runTranslate } from './translate'
import { runSentiment } from './sentiment'
import { runSummarize } from './summarize'
import { runUrlScreenshot } from './urlScreenshot'
import { runScheduler } from './scheduler'
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
  {
    id: 'python',
    label: 'Python',
    description: 'Run Python 3.12 in the browser (Pyodide)',
    icon: '🐍',
    paletteGroup: 'custom',
    paletteDragType: 'tool-python',
    requirement: { kind: 'none' },
    inputs: [{ id: 'in', label: 'In', direction: 'in', dataType: 'any' }],
    outputs: [TEXT_OUT],
    run: wrapLegacyRun(async (input, config) => runPython(input, config)),
  },
  // ─── Phase B: Newly registered tools (24 nodes) ────────────────────
  {
    id: 'audio-tool',
    label: 'Audio Tool',
    description: 'Decode audio URL → info or WAV export',
    icon: '🔊',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-audio-tool',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runAudioTool(input, config)),
  },
  {
    id: 'browser-login',
    label: 'Browser Login',
    description: 'Store/replay session cookies + headers for fetch',
    icon: '🍪',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-browser-login',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => c.action !== 'request' || !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runBrowserLogin(input, config)),
  },
  {
    id: 'chart-js',
    label: 'Chart.js',
    description: 'Render bar/line/pie/doughnut/scatter chart → PNG data URL',
    icon: '📊',
    paletteGroup: 'browser',
    browserSubcategory: 'generate',
    paletteDragType: 'tool-chart-js',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runChartJs(input, config)),
  },
  {
    id: 'd3-chart',
    label: 'D3 Chart',
    description: 'Render a D3 bar/line chart → SVG blob URL',
    icon: '📈',
    paletteGroup: 'browser',
    browserSubcategory: 'generate',
    paletteDragType: 'tool-d3-chart',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runD3Chart(input, config)),
  },
  {
    id: 'discord-send',
    label: 'Discord Webhook',
    description: 'Post a message or embed to a Discord channel',
    icon: '💬',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-discord-send',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.webhookUrl?.trim() && !!c.content?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runDiscord(input, config)),
  },
  {
    id: 'ffmpeg',
    label: 'FFmpeg',
    description: 'Transcode/clip media in-browser via ffmpeg.wasm',
    icon: '🎞️',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-ffmpeg',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runFFmpeg(input, config)),
  },
  {
    id: 'ffprobe',
    label: 'FFprobe',
    description: 'Read media metadata via ffmpeg.wasm',
    icon: '🔍',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-ffprobe',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runFFprobe(input, config)),
  },
  {
    id: 'file-download',
    label: 'File Download',
    description: 'Save a URL to disk via the File System Access API',
    icon: '💾',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-file-download',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runFileDownload(input, config)),
  },
  {
    id: 'fusion-meta',
    label: 'Fusion Meta',
    description: 'Fetch oEmbed metadata for a media URL',
    icon: '🪄',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-fusion-meta',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() && !!c.oembedUrl?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runFusionMeta(input, config)),
  },
  {
    id: 'image-resize',
    label: 'Image Resize',
    description: 'Resize an image URL to WxH via Canvas',
    icon: '🖼️',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-image-resize',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runImageResize(input, config)),
  },
  {
    id: 'language-detect',
    label: 'Language Detect',
    description: 'Detect language of text (100+ languages via franc)',
    icon: '🌐',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-language-detect',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runLanguageDetect(input, config)),
  },
  {
    id: 'long-text-gen',
    label: 'Long Text Gen',
    description: 'Generate multi-chapter long-form text via Groq',
    icon: '📚',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-long-text-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.topic?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runLongTextGen(input, config)),
  },
  {
    id: 'ocr',
    label: 'OCR',
    description: 'Extract text from an image URL via tesseract.js',
    icon: '🔍',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-ocr',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runOcr(input, config)),
  },
  {
    id: 'pdf-tool',
    label: 'PDF Tool',
    description: 'Create or merge PDFs in-browser via pdf-lib',
    icon: '📄',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-pdf-tool',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => c.mode !== 'merge' || !!c.urls?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runPdfTool(input, config)),
  },
  {
    id: 'photon',
    label: 'Photon',
    description: 'Apply grayscale/sepia/blur/invert filters via photon-wasm',
    icon: '🎨',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-photon',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runPhoton(input, config)),
  },
  {
    id: 'rust-lib',
    label: 'Rust WASM Runner',
    description: 'Load a Rust-compiled .wasm URL and call an exported function',
    icon: '🦀',
    paletteGroup: 'custom',
    paletteDragType: 'tool-rust-lib',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.wasmUrl?.trim() && !!c.functionName?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runRustLib(input, config)),
  },
  {
    id: 'spell-check',
    label: 'Spell Check',
    description: 'Check English spelling + suggest corrections (nspell)',
    icon: '✏️',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-spell-check',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runSpellCheck(input, config)),
  },
  {
    id: 'text-diff',
    label: 'Text Diff',
    description: 'Compare two texts (lines/words/chars/json) via diff',
    icon: '⚖️',
    paletteGroup: 'browser',
    browserSubcategory: 'compare',
    paletteDragType: 'tool-text-diff',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.oldText?.trim() && !!c.newText?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextDiff(input, config)),
  },
  {
    id: 'tfjs',
    label: 'TensorFlow.js',
    description: 'Run a TF.js LayersModel — info or image classification',
    icon: '🧠',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-tfjs',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => c.mode === 'info' || !!c.modelUrl?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTfjs(input, config)),
  },
  {
    id: 'thumbnail-gen',
    label: 'Thumbnail Gen',
    description: 'Create a YouTube-style thumbnail (title + bg) via Canvas',
    icon: '🖼️',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-thumbnail-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.title?.trim() || !!c.bgImage?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runThumbnailGen(input, config)),
  },
  {
    id: 'wasm-runner',
    label: 'WASM Runner',
    description: 'Load any .wasm URL, call an exported function, read result',
    icon: '🧩',
    paletteGroup: 'custom',
    paletteDragType: 'tool-wasm-runner',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.wasmUrl?.trim() && !!c.functionName?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runWasm(input, config)),
  },
  {
    id: 'web-audio',
    label: 'Web Audio',
    description: 'Decode an audio URL → info or frequency analysis',
    icon: '🎚️',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-web-audio',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runWebAudio(input, config)),
  },
  {
    id: 'yaml-tool',
    label: 'YAML Tool',
    description: 'Parse YAML → JSON or stringify JSON → YAML',
    icon: '⚙️',
    paletteGroup: 'browser',
    browserSubcategory: 'encoding',
    paletteDragType: 'tool-yaml-tool',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runYamlTool(input, config)),
  },
  {
    id: 'ytdlp',
    label: 'yt-dlp',
    description: 'Fetch video info or download via the /api/ytdlp worker proxy',
    icon: '⬇️',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-ytdlp',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runYtDlp(input, config)),
  },
  // ─── Phase 2: NEW POWER NODES (added per user request) ───────────────
  {
    id: 'kaggle-notebook',
    label: 'Kaggle Notebook',
    description: 'Run / status / output of a Kaggle notebook via worker',
    icon: '🧠',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-kaggle-notebook',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => c.action !== 'output' || !!c.slug?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runKaggleNotebook(input, config)),
  },
  {
    id: 'colab-notebook',
    label: 'Colab Notebook',
    description: 'Start / stop / status / output of a Google Colab notebook',
    icon: '📊',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-colab-notebook',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => c.action !== 'status' || !!c.notebookId?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runColabNotebook(input, config)),
  },
  {
    id: 'ai-video-gen',
    label: 'AI Video Gen',
    description: 'Generate video or video script via Workers AI / Groq',
    icon: '🎬',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-ai-video-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.prompt?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runAiVideoGen(input, config)),
  },
  {
    id: 'ai-audio-gen',
    label: 'AI Audio Gen',
    description: 'Generate audio (TTS / music) via Workers AI',
    icon: '🎵',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-ai-audio-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.prompt?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runAiAudioGen(input, config)),
  },
  {
    id: 'ai-image-gen',
    label: 'AI Image Gen',
    description: 'Generate an image from a prompt (Stable Diffusion XL via Workers AI)',
    icon: '🎨',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-ai-image-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.prompt?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runAiImageGen(input, config)),
  },
  {
    id: 'prompt-bucket',
    label: 'Prompt Bucket',
    description: 'Curated prompt templates for writing, coding, research, marketing',
    icon: '🗂️',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-prompt-bucket',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: true, canRunWithoutInput: (c) => !!c.category?.trim() || !!c.templateId?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runPromptBucket(input, config)),
  },
  {
    id: 'carousel-gen',
    label: 'Carousel Gen',
    description: 'Multi-slide carousel (PNG data URLs) from a topic',
    icon: '🖼️',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-carousel-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.topic?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runCarouselGen(input, config)),
  },
  {
    id: 'stock-footage',
    label: 'Stock Footage',
    description: 'Search Pexels, Pixabay, or Unsplash for stock videos/photos',
    icon: '📹',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-stock-footage',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.query?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runStockFootage(input, config)),
  },
  {
    id: 'image-edit',
    label: 'Image Edit',
    description: 'Crop / rotate / filter / watermark an image via Canvas',
    icon: '✨',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-image-edit',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runImageEdit(input, config)),
  },
  {
    id: 'trendpy',
    label: 'Trend & Forecast (trendpy)',
    description: 'Trend analysis + forecasting via Pyodide trendpy (JS fallback)',
    icon: '📈',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-trendpy',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.data?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTrendpy(input, config)),
  },
  {
    id: 'rss-reader',
    label: 'RSS Reader',
    description: 'Parse any RSS / Atom feed — latest items',
    icon: '📰',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-rss-reader',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runRssReader(input, config)),
  },
  {
    id: 'hackernews',
    label: 'Hacker News',
    description: 'Top / new / best / ask / show HN stories — no key needed',
    icon: '🟧',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-hackernews',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: true, canRunWithoutInput: () => true },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runHackernews(input, config)),
  },
  {
    id: 'reddit-scraper',
    label: 'Reddit Scraper',
    description: 'Top posts from a subreddit — no key needed',
    icon: '👽',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-reddit-scraper',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.subreddit?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runRedditScraper(input, config)),
  },
  {
    id: 'openai-chat',
    label: 'OpenAI Chat',
    description: 'Chat via OpenAI GPT-4o / o1 — auto-key via worker KV',
    icon: '🤖',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-openai-chat',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runOpenaiChat(input, config)),
  },
  {
    id: 'anthropic-chat',
    label: 'Anthropic Chat',
    description: 'Chat via Anthropic Claude 3.5 Sonnet — auto-key via worker KV',
    icon: '🪶',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-anthropic-chat',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runAnthropicChat(input, config)),
  },
  {
    id: 'mistral-chat',
    label: 'Mistral Chat',
    description: 'Chat via Mistral Small / Large — auto-key via worker KV',
    icon: '🌬️',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-mistral-chat',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runMistralChat(input, config)),
  },
  {
    id: 'cohere-chat',
    label: 'Cohere Chat',
    description: 'Chat via Cohere Command R+ — auto-key via worker KV',
    icon: '🔗',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-cohere-chat',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runCohereChat(input, config)),
  },
  {
    id: 'web-search',
    label: 'Web Search',
    description: 'Search the web via DuckDuckGo, Wikipedia, or SearX — no key',
    icon: '🔎',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-web-search',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.query?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runWebSearch(input, config)),
  },
  {
    id: 'wikipedia-search',
    label: 'Wikipedia',
    description: 'Search / summary / full page — free MediaWiki API',
    icon: '📚',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-wikipedia-search',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.query?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runWikipediaSearch(input, config)),
  },
  {
    id: 'github-api',
    label: 'GitHub API',
    description: 'Repo info / issues / PRs / user / search — auto-key via worker KV',
    icon: '🐙',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-github-api',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.repo?.trim() || !!c.query?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runGithubApi(input, config)),
  },
  {
    id: 'currency-convert',
    label: 'Currency Convert',
    description: 'Live FX rates — free Frankfurter API (no key)',
    icon: '💱',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-currency-convert',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: true, canRunWithoutInput: (c) => !!c.amount?.trim() || !!c.from?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runCurrencyConvert(input, config)),
  },
  {
    id: 'weather',
    label: 'Weather',
    description: '7-day forecast — free Open-Meteo (no key)',
    icon: '⛅',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-weather',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.location?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runWeather(input, config)),
  },
  {
    id: 'ip-lookup',
    label: 'IP Lookup',
    description: 'Geo-locate any IP — free ip-api.com (no key)',
    icon: '🌍',
    paletteGroup: 'browser',
    browserSubcategory: 'curated',
    paletteDragType: 'tool-ip-lookup',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: true, canRunWithoutInput: () => true },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runIpLookup(input, config)),
  },
  {
    id: 'qr-code',
    label: 'QR Code',
    description: 'Generate a QR code PNG from text — free goqr.me',
    icon: '🔲',
    paletteGroup: 'browser',
    browserSubcategory: 'generate',
    paletteDragType: 'tool-qr-code',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.text?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runQrCode(input, config)),
  },
  {
    id: 'barcode-gen',
    label: 'Barcode Gen',
    description: 'Generate CODE128 / EAN13 / UPC / ITF barcodes — JsBarcode (CDN)',
    icon: '🏷️',
    paletteGroup: 'browser',
    browserSubcategory: 'generate',
    paletteDragType: 'tool-barcode-gen',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.text?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runBarcodeGen(input, config)),
  },
  {
    id: 'text-to-speech-cloud',
    label: 'Cloud TTS',
    description: 'Text-to-speech via OpenAI tts-1 (auto-key via worker KV)',
    icon: '🔊',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-text-to-speech-cloud',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTextToSpeechCloud(input, config)),
  },
  {
    id: 'speech-to-text-cloud',
    label: 'Cloud STT',
    description: 'Speech-to-text via Groq Whisper — auto-key via worker KV',
    icon: '🎙️',
    paletteGroup: 'cloud',
    paletteDragType: 'tool-speech-to-text-cloud',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.audioUrl?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runSpeechToTextCloud(input, config)),
  },
  {
    id: 'translate',
    label: 'Translate',
    description: 'Translate text — free MyMemory API (no key, 5k/day)',
    icon: '🌐',
    paletteGroup: 'browser',
    browserSubcategory: 'text',
    paletteDragType: 'tool-translate',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.text?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runTranslate(input, config)),
  },
  {
    id: 'sentiment',
    label: 'Sentiment',
    description: 'Sentiment polarity + emoji from text — pure JS (no API)',
    icon: '😀',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-sentiment',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runSentiment(input, config)),
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Extractive / bullet / one-line / headline summary — pure JS',
    icon: '📝',
    paletteGroup: 'browser',
    browserSubcategory: 'ai',
    paletteDragType: 'tool-summarize',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: () => false },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runSummarize(input, config)),
  },
  {
    id: 'url-screenshot',
    label: 'URL Screenshot',
    description: 'Capture a website screenshot — Microlink free (no key)',
    icon: '📸',
    paletteGroup: 'browser',
    browserSubcategory: 'media',
    paletteDragType: 'tool-url-screenshot',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.url?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runUrlScreenshot(input, config)),
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    description: 'Register a cron trigger that fires a webhook or workflow',
    icon: '⏰',
    paletteGroup: 'browser',
    browserSubcategory: 'flow',
    paletteDragType: 'tool-scheduler',
    requirement: { kind: 'none' },
    autoRun: { defaultEnabled: false, canRunWithoutInput: (c) => !!c.cron?.trim() },
    ...DEFAULT_TOOL_IO,
    run: wrapLegacyRun(async (input, config) => runScheduler(input, config)),
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
  media: 'Media',
  ai: 'AI',
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
