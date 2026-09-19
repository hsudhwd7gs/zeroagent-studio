/**
 * Plain-language safety notices for tools that touch the network, device,
 * clipboard, cloud APIs, or user code. Shown in the inspector and linked from docs.
 */

export type ToolSafetyLevel = 'standard' | 'network' | 'privacy' | 'sandbox' | 'cloud'

export interface ToolSafetyNotice {
  level: ToolSafetyLevel
  title: string
  summary: string
  bullets: string[]
}

const NOTICES: Record<string, ToolSafetyNotice> = {
  'web-scraper': {
    level: 'network',
    title: 'Web fetching — read this first',
    summary:
      'You choose the URL. Many sites forbid automated scraping in their terms or robots.txt.',
    bullets: [
      'Only fetch pages you are allowed to access — check the site’s Terms of Service and robots.txt.',
      'Login walls, paywalls, and “no bots” rules mean you should not scrape that page.',
      'If a site returns 403 Forbidden, stop — do not treat that as a puzzle to bypass.',
      'Your browser may route the request through public CORS proxies; those services can see the URL you requested.',
      'Scraped text is passed to downstream blocks (including cloud AI if wired). Treat page content as untrusted input.',
      'Stick to public pages you own or have permission to use (e.g. Wikipedia, your own blog).',
    ],
  },
  'fetch-json': {
    level: 'network',
    title: 'Full HTTP — read this first',
    summary:
      'Sends any HTTP method with custom headers and body to the URL you provide.',
    bullets: [
      'Headers you enter are sent to the target server — including any API keys or tokens. Only use trusted URLs.',
      'Custom headers and non-GET methods trigger a CORS preflight. If the server does not allow them, the request fails.',
      'Never paste keys you cannot rotate into a workflow you plan to export or share.',
      'Responses flow downstream — cloud Agents will forward them to your AI provider if wired.',
      'Treat all responses as untrusted input. Do not eval or execute remote content.',
      'For APIs that block browser requests (no CORS), use a server-side relay — not a CORS proxy you do not control.',
    ],
  },
  'file-reader': {
    level: 'privacy',
    title: 'Local files stay in your browser',
    summary: 'Files are read on your device — we never upload them to a Brainwire server.',
    bullets: [
      'If you connect this block to an Agent with a cloud AI key, file contents are sent to that provider.',
      'Do not load passwords, medical records, or secrets you would not paste into a third-party chat.',
      'Exported workflows do not include file contents — only the block settings.',
    ],
  },
  speech: {
    level: 'privacy',
    title: 'Microphone and speakers',
    summary: 'Speech uses your browser’s built-in APIs on this device.',
    bullets: [
      'Listen mode asks for microphone permission. Audio is processed locally by the browser vendor.',
      'Transcripts flow downstream — cloud Agents will send text to your chosen AI provider.',
      'Use headphones in shared spaces; stop listening when you are done.',
    ],
  },
  clipboard: {
    level: 'privacy',
    title: 'Clipboard access',
    summary: 'Can read or write whatever is on your system clipboard right now.',
    bullets: [
      'Read mode may capture passwords or tokens if they were copied — clear clipboard after sensitive paste.',
      'Write mode overwrites clipboard contents. Confirm before running in a workflow.',
      'Some browsers block clipboard access until you interact with the page.',
    ],
  },
  'custom-script': {
    level: 'sandbox',
    title: 'Your JavaScript — powerful, use responsibly',
    summary:
      'Runs locally in a Web Worker with full network, evaluation, and nested workers available. 256 KB script size, 10-minute timeout.',
    bullets: [
      'Network access is enabled — fetch, XHR, WebSocket, and EventSource work in this sandbox. Only call URLs you trust.',
      'Custom headers you send are visible to the target server. Never paste keys you cannot rotate.',
      'eval and the Function constructor are available. Only run code you wrote or fully reviewed.',
      'Nested Workers and importScripts are allowed — you can spawn sub-tasks, but they share the same memory cap.',
      'Long-running scripts are cut off at 10 minutes; runaway memory is killed at 500 MB.',
      'Never paste API keys or passwords into a workflow you plan to export or share — they are stored in the workflow JSON.',
      'Downstream Agents see script output as plain text — do not return secrets.',
    ],
  },
  'groq-transcribe': {
    level: 'cloud',
    title: 'Audio sent to Groq',
    summary: 'Audio you provide is uploaded from your browser directly to Groq’s API.',
    bullets: [
      'Uses your Groq API key — Groq’s privacy policy applies.',
      'Do not transcribe confidential recordings you cannot share with a cloud vendor.',
      'Delete the key in Privacy & keys when finished on a shared computer.',
    ],
  },
  'gemini-vision': {
    level: 'cloud',
    title: 'Images sent to Google Gemini',
    summary: 'Image bytes leave your device and go to Google’s Gemini API.',
    bullets: [
      'Uses your Gemini API key. Google’s terms and data policies apply.',
      'Do not analyze ID documents, private photos, or screenshots with passwords visible.',
    ],
  },
  'gemini-embeddings': {
    level: 'cloud',
    title: 'Text sent to Google Gemini',
    summary: 'Input text is sent to Google to compute embedding vectors.',
    bullets: [
      'Uses your Gemini API key. Avoid embedding secrets or personal data you would not cloud-store.',
    ],
  },
  'openrouter-embeddings': {
    level: 'cloud',
    title: 'Text sent to OpenRouter',
    summary: 'Input text is sent to OpenRouter and the model provider they route to.',
    bullets: [
      'Uses your OpenRouter API key. Check OpenRouter and model provider policies.',
      'Do not embed passwords, private messages, or regulated health/financial data.',
    ],
  },
  'text-transform': {
    level: 'standard',
    title: 'Regex modes',
    summary: 'Complex regex on huge text can be slow — patterns run locally in your browser.',
    bullets: [
      'Avoid catastrophic backtracking patterns (e.g. nested quantifiers) on untrusted megabyte strings.',
    ],
  },
}

/** Default notice for cloud palette group when no specific entry exists. */
const GENERIC_CLOUD: ToolSafetyNotice = {
  level: 'cloud',
  title: 'Cloud API tool',
  summary: 'Data you pass in leaves your browser and goes to the API provider using your key.',
  bullets: [
    'You control the key in Settings — we never see it.',
    'Read the provider’s privacy policy before sending personal or confidential content.',
  ],
}

export function getToolSafetyNotice(toolId: string, paletteGroup?: string): ToolSafetyNotice | null {
  if (NOTICES[toolId]) return NOTICES[toolId]
  if (paletteGroup === 'cloud') return GENERIC_CLOUD
  return null
}

export function listToolsWithSafetyNotices(): string[] {
  return Object.keys(NOTICES)
}
