/**
 * Plain-language privacy transparency for cloud AI providers.
 * Links point to official provider documentation — verify there before trusting us.
 */

export type CloudProviderId = 'openrouter' | 'groq' | 'gemini'

export interface ProviderPrivacyGuide {
  id: CloudProviderId
  name: string
  /** What Brainwire sends when you use this provider */
  whatWeSend: string[]
  /** Honest risks — no marketing spin */
  risks: string[]
  /** What you can configure on the provider's side */
  settingsToCheck: { label: string; url: string }[]
  /** Official policies */
  policyLinks: { label: string; url: string }[]
}

export const CLOUD_PROVIDER_GUIDES: ProviderPrivacyGuide[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    whatWeSend: [
      'Chat messages you type and text wired into Agents (including upstream File Reader, Web Scraper, Speech, Clipboard, etc.).',
      'Agent system prompts and model names.',
      'Your API key in the request header — only to api.openrouter.ai, never to us.',
    ],
    risks: [
      'OpenRouter is a router: your prompt may be forwarded to a third-party model host. Their retention/training rules apply too.',
      'Free models can change; routing depends on your OpenRouter privacy toggles.',
      'If you enable “use my data for product improvement” or private logging in OpenRouter, more is stored than the default.',
    ],
    settingsToCheck: [
      {
        label: 'Privacy settings (training & provider routing)',
        url: 'https://openrouter.ai/settings/privacy',
      },
      {
        label: 'Observability — keep Input/Output Logging OFF unless you want logs',
        url: 'https://openrouter.ai/settings/observability',
      },
      {
        label: 'Official data-collection guide',
        url: 'https://openrouter.ai/docs/guides/privacy/data-collection',
      },
    ],
    policyLinks: [
      { label: 'Privacy Policy', url: 'https://openrouter.ai/privacy' },
      { label: 'Terms of Service', url: 'https://openrouter.ai/terms' },
      { label: 'FAQ (logging & providers)', url: 'https://openrouter.ai/docs/faq' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    whatWeSend: [
      'Chat + Agent context text when an Agent uses Groq as its brain.',
      'Audio files when you run Groq Transcribe (picked in the browser, sent to api.groq.com).',
      'Your API key in the request — only to Groq, never to us.',
    ],
    risks: [
      'Groq processes prompts on their cloud for inference. Standard API terms apply; enterprise ZDR is negotiated separately.',
      'Do not send medical, legal, or credential data you would not email to a US cloud vendor.',
      'Transcribe uploads entire audio clips — treat recordings like cloud uploads.',
    ],
    settingsToCheck: [
      {
        label: 'Groq Console (account & API keys)',
        url: 'https://console.groq.com',
      },
      {
        label: 'Legal, DPA & service terms',
        url: 'https://console.groq.com/docs/legal',
      },
    ],
    policyLinks: [
      { label: 'Privacy Policy', url: 'https://groq.com/privacy-policy/' },
      { label: 'Trust Center', url: 'https://trust.groq.com' },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini API',
    whatWeSend: [
      'Chat + Agent context when an Agent uses Gemini.',
      'Images + prompts for Gemini Vision; text for Gemini Embeddings.',
      'Your API key via header to Google — never to us.',
    ],
    risks: [
      'Free-tier / AI Studio API keys are often “Unpaid Services” — Google may use prompts to improve products unless you are on paid terms. Read the current Gemini API Terms.',
      'Paid tiers generally do not use prompts to train models, but may retain briefly for abuse monitoring.',
      'Vision sends pixels you choose — screenshots may contain secrets.',
    ],
    settingsToCheck: [
      {
        label: 'Google AI Studio (API key & project)',
        url: 'https://aistudio.google.com/apikey',
      },
      {
        label: 'Gemini API Terms (paid vs unpaid — read carefully)',
        url: 'https://ai.google.dev/gemini-api/terms',
      },
      {
        label: 'Abuse monitoring & prompt retention (official)',
        url: 'https://ai.google.dev/gemini-api/docs/usage-policies',
      },
      {
        label: 'Zero data retention options (paid / ZDR)',
        url: 'https://ai.google.dev/gemini-api/docs/zdr',
      },
    ],
    policyLinks: [
      { label: 'Google Privacy Policy', url: 'https://policies.google.com/privacy' },
      { label: 'Gemini Apps Privacy Hub', url: 'https://support.google.com/gemini/answer/13594961' },
    ],
  },
]

export const LOCAL_PRIVACY_SUMMARY = {
  title: 'Local AI (Transformers.js / WebLLM)',
  body: 'Inference runs on your device after models download from Hugging Face or MLC CDNs. Your chat text does not go to OpenRouter, Groq, or Google for those steps. Model weights are public downloads — not private cloud inference.',
  links: [
    { label: 'Hugging Face Privacy', url: 'https://huggingface.co/privacy' },
  ],
}

export const BRAINWIRE_PRIVACY_TRUTH = {
  title: 'What Brainwire does NOT do',
  bullets: [
    'We have no servers that receive your chat, files, or keys.',
    'No analytics SDK or telemetry endpoint — we cannot measure or monetize your usage.',
    'Workflows and keys stay in your browser — tags in Privacy & keys show when each goes away.',
    'Export (.brainwire.json) never includes API keys; it can still contain chat text — treat exports like sharing a diary.',
  ],
  chatWarning:
    'When you press send, your message flows through every wired block. If an Agent uses a cloud brain or a cloud tool runs, that text (and upstream file/web/audio content) leaves your browser to the provider you configured.',
}

export function getProviderGuide(id: CloudProviderId): ProviderPrivacyGuide {
  const guide = CLOUD_PROVIDER_GUIDES.find((g) => g.id === id)
  if (!guide) throw new Error(`Unknown provider: ${id}`)
  return guide
}
