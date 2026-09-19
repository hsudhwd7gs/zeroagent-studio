export interface ManifestConfigField {
  key: string
  label: string
  placeholder?: string
  hint?: string
  type?: 'text' | 'number' | 'textarea' | 'select' | 'password'
  options?: string[]
}

/**
 * Per-tool config field descriptors.
 * Used by ToolInspectorFields to render a basic input for any tool that
 * does NOT have a custom inspector branch.
 *
 * For complex tools (multi-field, custom UIs), add a dedicated branch in
 * ToolInspectorFields.tsx instead.
 */
const FIELDS: Record<string, ManifestConfigField[]> = {
  // ─── Existing manifest presets (text/json/list/math/date/regex/...) ───
  'json-get-path': [{ key: 'path', label: 'Dot path', placeholder: 'user.name', hint: 'Required — e.g. items.0.title' }],
  'json-set-path': [
    { key: 'path', label: 'Dot path', placeholder: 'user.name' },
    { key: 'value', label: 'Value (JSON or text)', placeholder: '"Alice"' },
  ],
  'json-delete-path': [{ key: 'path', label: 'Dot path', placeholder: 'user.secret' }],
  'json-merge': [{ key: 'other', label: 'Other JSON object', placeholder: '{"role":"admin"}' }],
  'json-pick-keys': [{ key: 'keys', label: 'Keys (comma-separated)', placeholder: 'name,email' }],
  'json-omit-keys': [{ key: 'keys', label: 'Keys to remove', placeholder: 'password,token' }],
  'join-lines': [{ key: 'separator', label: 'Separator', placeholder: ', ' }],
  'join-words': [{ key: 'separator', label: 'Separator', placeholder: ' ' }],
  'merge-lines-flow': [{ key: 'separator', label: 'Separator', placeholder: ' ' }],
  'replace-all': [
    { key: 'search', label: 'Search', placeholder: 'old' },
    { key: 'replace', label: 'Replace with', placeholder: 'new' },
  ],
  'indent-lines': [{ key: 'prefix', label: 'Line prefix', placeholder: '  ' }],
  'grep-lines': [
    { key: 'pattern', label: 'Regex pattern', placeholder: 'error' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'grep-lines-inverse': [
    { key: 'pattern', label: 'Regex pattern', placeholder: 'debug' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'count-lines-matching': [
    { key: 'pattern', label: 'Regex pattern', placeholder: 'WARN' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'group-by-prefix': [{ key: 'delimiter', label: 'Prefix delimiter', placeholder: '/' }],
  'zip-lines': [
    { key: 'other', label: 'Second list (lines)', placeholder: 'b1\nb2' },
    { key: 'separator', label: 'Join separator', placeholder: ' | ' },
  ],
  'sample-lines': [{ key: 'n', label: 'Sample size', placeholder: '3', type: 'number' }],
  'head-lines': [{ key: 'n', label: 'Line count', placeholder: '5', type: 'number' }],
  'tail-lines': [{ key: 'n', label: 'Line count', placeholder: '5', type: 'number' }],
  'nth-line': [{ key: 'n', label: 'Line index (0-based)', placeholder: '0', type: 'number' }],
  'default-if-empty': [{ key: 'default', label: 'Default value', placeholder: 'N/A' }],
  'if-empty': [{ key: 'message', label: 'Empty message', placeholder: 'No input' }],
  template: [{ key: 'template', label: 'Template', placeholder: 'Hello {{input}}!' }],
  'line-template': [{ key: 'template', label: 'Per-line template', placeholder: '- {{line}}' }],
  'add-prefix': [{ key: 'prefix', label: 'Prefix', placeholder: '[tag] ' }],
  'add-suffix': [{ key: 'suffix', label: 'Suffix', placeholder: ' — end' }],
  'wrap-text': [{ key: 'width', label: 'Wrap width', placeholder: '80', type: 'number' }],
  'truncate-words': [{ key: 'max', label: 'Max words', placeholder: '50', type: 'number' }],
  'math-eval': [{ key: 'expression', label: 'Expression', placeholder: '2 + 2 * 3', hint: 'Uses input when empty' }],
  'math-clamp': [
    { key: 'min', label: 'Minimum', placeholder: '0', type: 'number' },
    { key: 'max', label: 'Maximum', placeholder: '100', type: 'number' },
  ],
  'math-max': [{ key: 'b', label: 'Second number (B)', placeholder: '0', type: 'number' }],
  'math-mod': [{ key: 'b', label: 'Modulo (B)', placeholder: '2', type: 'number' }],
  'math-percent': [{ key: 'percent', label: 'Percent', placeholder: '10', type: 'number' }],
  'format-number': [
    { key: 'locale', label: 'Locale', placeholder: 'en-US' },
    { key: 'fractionDigits', label: 'Decimal places', placeholder: '2', type: 'number' },
  ],
  'format-date': [{ key: 'format', label: 'Locale', placeholder: 'en-US' }],
  'add-days': [{ key: 'days', label: 'Days to add', placeholder: '7', type: 'number' }],
  'add-hours': [{ key: 'hours', label: 'Hours to add', placeholder: '2', type: 'number' }],
  'add-minutes': [{ key: 'minutes', label: 'Minutes to add', placeholder: '15', type: 'number' }],
  'relative-days': [{ key: 'days', label: 'Day offset', placeholder: '3', type: 'number' }],
  'diff-days': [{ key: 'other', label: 'Other date (ISO)', placeholder: '2025-01-01' }],
  'is-before-date': [{ key: 'other', label: 'Compare date (ISO)', placeholder: '2025-01-01' }],
  'matches-regex': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '^[a-z]+$' },
    { key: 'flags', label: 'Flags (optional)', placeholder: 'i' },
  ],
  'regex-extract-first': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '\\d+' },
    { key: 'flags', label: 'Flags', placeholder: 'g' },
  ],
  'regex-extract-all': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '[A-Za-z]+' },
    { key: 'flags', label: 'Flags', placeholder: 'g' },
  ],
  'regex-replace': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '\\s+' },
    { key: 'replacement', label: 'Replacement', placeholder: ' ' },
    { key: 'flags', label: 'Flags', placeholder: 'g' },
  ],
  'regex-split': [
    { key: 'pattern', label: 'Regex pattern', placeholder: ',' },
    { key: 'flags', label: 'Flags', placeholder: '' },
  ],
  'regex-test': [
    { key: 'pattern', label: 'Regex pattern', placeholder: '^https://' },
    { key: 'flags', label: 'Flags', placeholder: 'i' },
  ],
  'regex-capture-groups': [
    { key: 'pattern', label: 'Regex with groups', placeholder: '([0-9]+)-([0-9]+)' },
    { key: 'flags', label: 'Flags', placeholder: '' },
  ],
  'random-int': [
    { key: 'min', label: 'Minimum', placeholder: '0', type: 'number' },
    { key: 'max', label: 'Maximum', placeholder: '100', type: 'number' },
  ],
  'random-string': [{ key: 'length', label: 'Length', placeholder: '12', type: 'number' }],
  'random-hex': [{ key: 'bytes', label: 'Byte count', placeholder: '8', type: 'number' }],
  'lorem-ipsum': [{ key: 'words', label: 'Word count', placeholder: '20', type: 'number' }],
  'html-extract-meta': [{ key: 'name', label: 'Meta name/property', placeholder: 'description' }],
  'md-read-time': [{ key: 'wpm', label: 'Words per minute', placeholder: '200', type: 'number' }],
  'csv-select-column': [{ key: 'column', label: 'Column name', placeholder: 'email' }],
  'csv-filter-rows': [
    { key: 'column', label: 'Column name', placeholder: 'status' },
    { key: 'contains', label: 'Contains text', placeholder: 'active' },
  ],
  'csv-sort-rows': [{ key: 'column', label: 'Sort by column', placeholder: 'name' }],
  'csv-dedupe-rows': [{ key: 'column', label: 'Unique by column', placeholder: 'id' }],
  'text-equals': [{ key: 'other', label: 'Compare to', placeholder: 'expected' }],
  'text-contains': [{ key: 'other', label: 'Substring', placeholder: 'needle' }],
  'text-starts-with': [{ key: 'other', label: 'Prefix', placeholder: 'https://' }],
  'text-ends-with': [{ key: 'other', label: 'Suffix', placeholder: '.json' }],
  'line-diff-count': [{ key: 'other', label: 'Other text (lines)', placeholder: 'line1\nline2' }],
  'similarity-ratio': [{ key: 'other', label: 'Compare to', placeholder: 'other text' }],
  'contains-text': [{ key: 'text', label: 'Substring', placeholder: 'hello' }],
  'equals-ignore-case': [{ key: 'text', label: 'Compare to', placeholder: 'Hello' }],
  'min-length': [{ key: 'min', label: 'Minimum length', placeholder: '3', type: 'number' }],
  'max-length': [{ key: 'max', label: 'Maximum length', placeholder: '100', type: 'number' }],
  'in-range': [
    { key: 'min', label: 'Minimum', placeholder: '0', type: 'number' },
    { key: 'max', label: 'Maximum', placeholder: '100', type: 'number' },
  ],
  'pad-start': [
    { key: 'length', label: 'Target length', placeholder: '20', type: 'number' },
    { key: 'char', label: 'Pad character', placeholder: ' ' },
  ],
  'pad-end': [
    { key: 'length', label: 'Target length', placeholder: '20', type: 'number' },
    { key: 'char', label: 'Pad character', placeholder: ' ' },
  ],
  'truncate-text': [{ key: 'max', label: 'Max length', placeholder: '100', type: 'number' }],
  'repeat-text': [{ key: 'times', label: 'Repeat count', placeholder: '3', type: 'number' }],
  'fetch-json': [{ key: 'url', label: 'URL (optional if wired)', placeholder: 'https://api.example.com/data' }],

  // ─── Phase B + new nodes (24 curated + extras) ───
  'audio-tool': [
    { key: 'url', label: 'Audio URL', placeholder: 'https://example.com/song.mp3' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['info', 'wav'], placeholder: 'info' },
  ],
  'browser-login': [
    { key: 'action', label: 'Action', type: 'select', options: ['store', 'request', 'clear'], placeholder: 'store' },
    { key: 'url', label: 'URL (for request)', placeholder: 'https://api.example.com/me' },
    { key: 'cookies', label: 'Cookie header (store)', placeholder: 'session=abc; token=xyz', type: 'textarea' },
    { key: 'userAgent', label: 'User-Agent (optional)', placeholder: 'Mozilla/5.0 ...' },
  ],
  'chart-js': [
    { key: 'chartType', label: 'Chart type', type: 'select', options: ['bar', 'line', 'pie', 'doughnut', 'scatter'] },
    { key: 'title', label: 'Dataset label', placeholder: 'Data' },
    { key: 'data', label: 'Data JSON (if no upstream)', placeholder: '[{"label":"A","value":10}]', type: 'textarea' },
  ],
  'd3-chart': [
    { key: 'chartType', label: 'Chart type', type: 'select', options: ['bar', 'line'] },
    { key: 'data', label: 'Data JSON (if no upstream)', placeholder: '[{"label":"A","value":10}]', type: 'textarea' },
  ],
  'discord-send': [
    { key: 'webhookUrl', label: 'Discord webhook URL', placeholder: 'https://discord.com/api/webhooks/...', type: 'password' },
    { key: 'content', label: 'Message content', placeholder: 'Hello from ZeroAgent!', type: 'textarea' },
    { key: 'username', label: 'Bot username (optional)', placeholder: 'ZeroAgent Bot' },
  ],
  'ffmpeg': [
    { key: 'url', label: 'Input media URL', placeholder: 'https://example.com/video.mp4' },
    { key: 'format', label: 'Output format', placeholder: 'mp4' },
    { key: 'args', label: 'FFmpeg args (optional, overrides defaults)', placeholder: '-i input.bin -c:v libx264 output.mp4', type: 'textarea' },
  ],
  'ffprobe': [
    { key: 'url', label: 'Media URL', placeholder: 'https://example.com/video.mp4' },
  ],
  'file-download': [
    { key: 'url', label: 'URL to save', placeholder: 'https://example.com/file.pdf' },
    { key: 'filename', label: 'Suggested filename (optional)', placeholder: 'download.bin' },
  ],
  'fusion-meta': [
    { key: 'url', label: 'Media URL', placeholder: 'https://twitter.com/...' },
    { key: 'oembedUrl', label: 'oEmbed endpoint', placeholder: 'https://publish.twitter.com/oembed?url=' },
  ],
  'image-resize': [
    { key: 'url', label: 'Image URL', placeholder: 'https://example.com/photo.jpg' },
    { key: 'width', label: 'Width', placeholder: '800', type: 'number' },
    { key: 'height', label: 'Height', placeholder: '600', type: 'number' },
  ],
  'language-detect': [
    { key: 'only', label: 'Limit to (comma-separated ISO 3 codes, optional)', placeholder: 'eng,spa,fra' },
  ],
  'long-text-gen': [
    { key: 'topic', label: 'Topic', placeholder: 'The future of AI agents' },
    { key: 'chapters', label: 'Number of chapters', placeholder: '5', type: 'number' },
    { key: 'wordsPerChapter', label: 'Words per chapter', placeholder: '300', type: 'number' },
    { key: 'tone', label: 'Tone', placeholder: 'informative' },
  ],
  'ocr': [
    { key: 'url', label: 'Image URL', placeholder: 'https://example.com/scan.png' },
    { key: 'lang', label: 'Language (Tesseract code)', placeholder: 'eng' },
  ],
  'pdf-tool': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['create', 'merge'] },
    { key: 'text', label: 'Text (create mode)', placeholder: 'Hello from ZeroAgent!', type: 'textarea' },
    { key: 'urls', label: 'PDF URLs (merge mode, comma-separated)', placeholder: 'https://a.pdf,https://b.pdf' },
  ],
  'photon': [
    { key: 'url', label: 'Image URL', placeholder: 'https://example.com/photo.jpg' },
    { key: 'filter', label: 'Filter', type: 'select', options: ['grayscale', 'sepia', 'blur', 'invert', 'none'] },
  ],
  'rust-lib': [
    { key: 'wasmUrl', label: '.wasm URL', placeholder: 'https://example.com/lib.wasm' },
    { key: 'functionName', label: 'Function name', placeholder: 'main' },
    { key: 'argsJson', label: 'Args (JSON array)', placeholder: '[]', type: 'textarea' },
  ],
  'spell-check': [
    { key: 'language', label: 'Language (reserved, default en)', placeholder: 'en' },
  ],
  'text-diff': [
    { key: 'mode', label: 'Diff mode', type: 'select', options: ['lines', 'words', 'chars', 'json'] },
    { key: 'oldText', label: 'Old text', placeholder: 'original', type: 'textarea' },
    { key: 'newText', label: 'New text', placeholder: 'revised', type: 'textarea' },
  ],
  'tfjs': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['info', 'classify'] },
    { key: 'modelUrl', label: 'Model URL (classify)', placeholder: 'https://example.com/model.json' },
    { key: 'imageUrl', label: 'Image URL (classify)', placeholder: 'https://example.com/img.jpg' },
  ],
  'thumbnail-gen': [
    { key: 'title', label: 'Title', placeholder: 'How to build agents' },
    { key: 'subtitle', label: 'Subtitle (optional)', placeholder: 'A 5-min crash course' },
    { key: 'bgImage', label: 'Background image URL (optional)', placeholder: 'https://example.com/bg.jpg' },
    { key: 'bgColor', label: 'Background color (if no image)', placeholder: '#1a1a2e' },
    { key: 'accentColor', label: 'Accent color', placeholder: '#e94560' },
    { key: 'titleColor', label: 'Title color', placeholder: '#ffffff' },
    { key: 'width', label: 'Width', placeholder: '1280', type: 'number' },
    { key: 'height', label: 'Height', placeholder: '720', type: 'number' },
  ],
  'wasm-runner': [
    { key: 'wasmUrl', label: '.wasm URL', placeholder: 'https://example.com/hello.wasm' },
    { key: 'functionName', label: 'Function name', placeholder: 'main' },
    { key: 'argsJson', label: 'Args (JSON array)', placeholder: '[]', type: 'textarea' },
    { key: 'resultType', label: 'Result type', type: 'select', options: ['auto', 'i32', 'f64', 'string', 'json'] },
  ],
  'web-audio': [
    { key: 'url', label: 'Audio URL', placeholder: 'https://example.com/song.mp3' },
    { key: 'mode', label: 'Mode', type: 'select', options: ['info', 'analyze'] },
  ],
  'yaml-tool': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['parse', 'stringify'] },
  ],
  'ytdlp': [
    { key: 'url', label: 'Video URL', placeholder: 'https://www.youtube.com/watch?v=...' },
    { key: 'action', label: 'Action', type: 'select', options: ['info', 'download'] },
    { key: 'format', label: 'Quality (download)', placeholder: '720' },
  ],
  'api-key-manager': [
    { key: 'action', label: 'Action', type: 'select', options: ['add', 'list', 'delete', 'get'] },
    { key: 'name', label: 'Key name', placeholder: 'GROQ_API_KEY' },
    { key: 'value', label: 'Key value (for add)', placeholder: 'sk-...', type: 'password' },
  ],
  'youtube-analytics': [
    { key: 'apiKey', label: 'YouTube API key', placeholder: 'AIza...', type: 'password' },
    { key: 'videoId', label: 'Video ID', placeholder: 'dQw4w9WgXcQ' },
  ],
  'notion-api': [
    { key: 'token', label: 'Notion integration token', placeholder: 'ntn_...', type: 'password' },
    { key: 'action', label: 'Action', type: 'select', options: ['query', 'create', 'update'] },
    { key: 'databaseId', label: 'Database ID (for query/create)', placeholder: 'abc123...' },
  ],
  'telegram-send': [
    { key: 'botToken', label: 'Bot token', placeholder: '123:abc...', type: 'password' },
    { key: 'chatId', label: 'Chat ID', placeholder: '@channel or 12345' },
  ],
  'google-sheets': [
    { key: 'url', label: 'Sheets webhook URL (Apps Script)', placeholder: 'https://script.google.com/macros/s/...' },
  ],
  'google-analytics': [
    { key: 'propertyId', label: 'GA4 Property ID', placeholder: '123456789' },
    { key: 'accessToken', label: 'Access token', placeholder: 'ya29...', type: 'password' },
  ],
  'email-send': [
    { key: 'provider', label: 'Provider', type: 'select', options: ['resend', 'postmark', 'smtp-url'] },
    { key: 'apiKey', label: 'Provider API key', placeholder: 're_xxx', type: 'password' },
    { key: 'from', label: 'From', placeholder: 'me@example.com' },
    { key: 'to', label: 'To', placeholder: 'you@example.com' },
    { key: 'subject', label: 'Subject', placeholder: 'Hello from ZeroAgent' },
    { key: 'body', label: 'Body (text)', placeholder: 'Message content', type: 'textarea' },
  ],
  'webhook-send': [
    { key: 'url', label: 'Webhook URL', placeholder: 'https://example.com/hook' },
    { key: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT', 'PATCH'] },
    { key: 'headers', label: 'Headers (JSON)', placeholder: '{"Authorization":"Bearer ..."}', type: 'textarea' },
  ],
  'retry-backoff': [
    { key: 'url', label: 'URL', placeholder: 'https://example.com/api' },
    { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    { key: 'maxRetries', label: 'Max retries', placeholder: '3', type: 'number' },
    { key: 'initialDelay', label: 'Initial delay (ms)', placeholder: '500', type: 'number' },
  ],
  'variable-store': [
    { key: 'action', label: 'Action', type: 'select', options: ['set', 'get', 'append'] },
    { key: 'key', label: 'Key', placeholder: 'counter' },
  ],
  'cache': [
    { key: 'action', label: 'Action', type: 'select', options: ['get', 'set', 'delete', 'clear'] },
    { key: 'key', label: 'Key', placeholder: 'item:123' },
    { key: 'ttl', label: 'TTL (seconds, optional)', placeholder: '3600', type: 'number' },
  ],
  'timer': [
    { key: 'action', label: 'Action', type: 'select', options: ['start', 'stop', 'lap', 'total'] },
  ],

  // ─── Phase 2 — NEW POWER NODES (added below) ───
  'kaggle-notebook': [
    { key: 'action', label: 'Action', type: 'select', options: ['generate', 'status', 'output'] },
    { key: 'slug', label: 'Notebook slug (overrides worker default)', placeholder: 'myuser/my-notebook' },
    { key: 'prompts', label: 'Prompts (JSON array, generate action)', placeholder: '["a cat","a dog"]', type: 'textarea' },
    { key: 'outputType', label: 'Output type', type: 'select', options: ['image', 'video'] },
    { key: 'steps', label: 'Steps (number)', placeholder: '30', type: 'number' },
    { key: 'gpu', label: 'Enable GPU', type: 'select', options: ['true', 'false'] },
  ],
  'colab-notebook': [
    { key: 'action', label: 'Action', type: 'select', options: ['start', 'stop', 'status', 'output'] },
    { key: 'notebookId', label: 'Notebook ID (Colab /api/...) or path', placeholder: '1abc...xyz or my_nb.ipynb' },
    { key: 'token', label: 'Auth token (optional — stored in worker)', placeholder: 'stored in /api/keys', type: 'password' },
    { key: 'vars', label: 'Notebook vars (JSON, optional)', placeholder: '{"prompt":"hello"}', type: 'textarea' },
  ],
  'ai-video-gen': [
    { key: 'prompt', label: 'Prompt', placeholder: 'A cat playing piano, cinematic, 4K', type: 'textarea' },
    { key: 'provider', label: 'Provider', type: 'select', options: ['workers-ai', 'groq', 'openrouter'] },
    { key: 'model', label: 'Model (optional, provider-dependent)', placeholder: '@cf/bytedance/... (default)' },
    { key: 'seconds', label: 'Duration (seconds)', placeholder: '5', type: 'number' },
  ],
  'ai-audio-gen': [
    { key: 'prompt', label: 'Prompt', placeholder: 'A calm piano melody, 30 seconds', type: 'textarea' },
    { key: 'provider', label: 'Provider', type: 'select', options: ['workers-ai', 'groq'] },
    { key: 'format', label: 'Format', type: 'select', options: ['mp3', 'wav'] },
  ],
  'ai-image-gen': [
    { key: 'prompt', label: 'Prompt', placeholder: 'A serene landscape with mountains at sunset', type: 'textarea' },
    { key: 'provider', label: 'Provider', type: 'select', options: ['workers-ai', 'openrouter'] },
    { key: 'model', label: 'Model (optional)', placeholder: '@cf/stabilityai/stable-diffusion-xl-base-1.0' },
    { key: 'width', label: 'Width', placeholder: '1024', type: 'number' },
    { key: 'height', label: 'Height', placeholder: '1024', type: 'number' },
  ],
  'prompt-bucket': [
    { key: 'category', label: 'Category', type: 'select', options: ['writing', 'coding', 'research', 'marketing', 'education', 'summarization', 'translation'] },
    { key: 'templateId', label: 'Template ID (optional)', placeholder: 'blog-post-intro' },
  ],
  'carousel-gen': [
    { key: 'topic', label: 'Topic / title', placeholder: '5 things every AI builder should know' },
    { key: 'slides', label: 'Number of slides', placeholder: '5', type: 'number' },
    { key: 'style', label: 'Visual style', type: 'select', options: ['minimal', 'gradient', 'bold', 'corporate'] },
    { key: 'width', label: 'Slide width', placeholder: '1080', type: 'number' },
    { key: 'height', label: 'Slide height', placeholder: '1080', type: 'number' },
  ],
  'stock-footage': [
    { key: 'query', label: 'Search query', placeholder: 'ocean waves slow motion' },
    { key: 'provider', label: 'Provider', type: 'select', options: ['pexels', 'pixabay', 'unsplash'] },
    { key: 'apiKey', label: 'API key (optional, provider-dependent)', type: 'password' },
    { key: 'per_page', label: 'Results per page', placeholder: '5', type: 'number' },
  ],
  'image-edit': [
    { key: 'url', label: 'Source image URL', placeholder: 'https://example.com/photo.jpg' },
    { key: 'operation', label: 'Operation', type: 'select', options: ['crop', 'rotate', 'flipH', 'flipV', 'grayscale', 'blur', 'brightness', 'contrast', 'overlay-text', 'watermark'] },
    { key: 'x', label: 'Crop X (for crop)', placeholder: '0', type: 'number' },
    { key: 'y', label: 'Crop Y (for crop)', placeholder: '0', type: 'number' },
    { key: 'width', label: 'Width (crop/resize)', placeholder: '400', type: 'number' },
    { key: 'height', label: 'Height (crop/resize)', placeholder: '400', type: 'number' },
    { key: 'angle', label: 'Rotation angle (for rotate)', placeholder: '90', type: 'number' },
    { key: 'level', label: 'Level 0-100 (brightness/contrast/blur)', placeholder: '50', type: 'number' },
    { key: 'text', label: 'Text (for overlay-text/watermark)', placeholder: '@MyBrand' },
    { key: 'fontSize', label: 'Font size (overlay-text)', placeholder: '48', type: 'number' },
    { key: 'color', label: 'Color (overlay-text)', placeholder: '#ffffff' },
  ],
  'trendpy': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['trend', 'forecast', 'seasonal', 'correlation'] },
    { key: 'data', label: 'Data JSON (array of numbers or {date,value})', placeholder: '[10,20,30,40,50]', type: 'textarea' },
    { key: 'periods', label: 'Forecast periods (forecast mode)', placeholder: '7', type: 'number' },
    { key: 'method', label: 'Method', type: 'select', options: ['linear', 'moving_average', 'exponential'] },
  ],
  'rss-reader': [
    { key: 'url', label: 'RSS / Atom feed URL', placeholder: 'https://hnrss.org/frontpage' },
    { key: 'limit', label: 'Items limit', placeholder: '10', type: 'number' },
  ],
  'hackernews': [
    { key: 'action', label: 'Action', type: 'select', options: ['top', 'new', 'best', 'ask', 'show', 'item'] },
    { key: 'limit', label: 'Items limit', placeholder: '10', type: 'number' },
    { key: 'itemId', label: 'Item ID (for item action)', placeholder: '1234567' },
  ],
  'reddit-scraper': [
    { key: 'subreddit', label: 'Subreddit (no /r/)', placeholder: 'MachineLearning' },
    { key: 'sort', label: 'Sort', type: 'select', options: ['hot', 'new', 'top', 'rising'] },
    { key: 'limit', label: 'Posts limit', placeholder: '10', type: 'number' },
    { key: 'timeframe', label: 'Timeframe (for top)', type: 'select', options: ['hour', 'day', 'week', 'month', 'year', 'all'] },
  ],
  'openai-chat': [
    { key: 'apiKey', label: 'OpenAI API key', placeholder: 'sk-...', type: 'password' },
    { key: 'model', label: 'Model', placeholder: 'gpt-4o-mini' },
    { key: 'systemPrompt', label: 'System prompt', placeholder: 'You are a helpful assistant.', type: 'textarea' },
    { key: 'temperature', label: 'Temperature', placeholder: '0.7', type: 'number' },
    { key: 'maxTokens', label: 'Max tokens', placeholder: '2048', type: 'number' },
  ],
  'anthropic-chat': [
    { key: 'apiKey', label: 'Anthropic API key', placeholder: 'sk-ant-...', type: 'password' },
    { key: 'model', label: 'Model', placeholder: 'claude-3-5-sonnet-20241022' },
    { key: 'systemPrompt', label: 'System prompt', placeholder: 'You are a helpful assistant.', type: 'textarea' },
    { key: 'maxTokens', label: 'Max tokens', placeholder: '1024', type: 'number' },
  ],
  'mistral-chat': [
    { key: 'apiKey', label: 'Mistral API key', placeholder: '...', type: 'password' },
    { key: 'model', label: 'Model', placeholder: 'mistral-small-latest' },
    { key: 'systemPrompt', label: 'System prompt', placeholder: 'You are a helpful assistant.', type: 'textarea' },
    { key: 'temperature', label: 'Temperature', placeholder: '0.7', type: 'number' },
  ],
  'cohere-chat': [
    { key: 'apiKey', label: 'Cohere API key', placeholder: '...', type: 'password' },
    { key: 'model', label: 'Model', placeholder: 'command-r-plus' },
    { key: 'systemPrompt', label: 'System prompt', placeholder: 'You are a helpful assistant.', type: 'textarea' },
  ],
  'web-search': [
    { key: 'query', label: 'Search query', placeholder: 'latest AI news' },
    { key: 'engine', label: 'Engine', type: 'select', options: ['duckduckgo', 'wikipedia', 'searx'] },
    { key: 'limit', label: 'Results limit', placeholder: '8', type: 'number' },
  ],
  'wikipedia-search': [
    { key: 'query', label: 'Query', placeholder: 'Alan Turing' },
    { key: 'action', label: 'Action', type: 'select', options: ['search', 'summary', 'page'] },
    { key: 'limit', label: 'Limit (search action)', placeholder: '5', type: 'number' },
  ],
  'github-api': [
    { key: 'action', label: 'Action', type: 'select', options: ['repo', 'issues', 'pulls', 'user', 'search'] },
    { key: 'repo', label: 'owner/repo', placeholder: 'torvalds/linux' },
    { key: 'state', label: 'State (issues/pulls)', type: 'select', options: ['open', 'closed', 'all'] },
    { key: 'query', label: 'Query (search action)', placeholder: 'ai agents language:typescript' },
  ],
  'currency-convert': [
    { key: 'amount', label: 'Amount', placeholder: '100', type: 'number' },
    { key: 'from', label: 'From currency (ISO)', placeholder: 'USD' },
    { key: 'to', label: 'To currency (ISO)', placeholder: 'EUR' },
  ],
  'weather': [
    { key: 'location', label: 'Location (city or lat,lon)', placeholder: 'London' },
    { key: 'units', label: 'Units', type: 'select', options: ['metric', 'imperial'] },
  ],
  'ip-lookup': [
    { key: 'ip', label: 'IP address (or empty for yours)', placeholder: '8.8.8.8' },
  ],
  'qr-code': [
    { key: 'text', label: 'Text to encode', placeholder: 'https://example.com' },
    { key: 'size', label: 'Size (px)', placeholder: '256', type: 'number' },
    { key: 'color', label: 'Foreground color', placeholder: '#000000' },
    { key: 'bgColor', label: 'Background color', placeholder: '#ffffff' },
  ],
  'barcode-gen': [
    { key: 'text', label: 'Text to encode', placeholder: '0123456789' },
    { key: 'format', label: 'Format', type: 'select', options: ['CODE128', 'EAN13', 'UPC', 'ITF', 'MSI', 'pharmacode'] },
    { key: 'width', label: 'Width', placeholder: '2', type: 'number' },
    { key: 'height', label: 'Height', placeholder: '100', type: 'number' },
  ],
  'text-to-speech-cloud': [
    { key: 'provider', label: 'Provider', type: 'select', options: ['openai', 'groq', 'azure'] },
    { key: 'apiKey', label: 'API key', type: 'password' },
    { key: 'voice', label: 'Voice', placeholder: 'alloy' },
    { key: 'format', label: 'Format', type: 'select', options: ['mp3', 'opus', 'aac', 'flac'] },
  ],
  'speech-to-text-cloud': [
    { key: 'provider', label: 'Provider', type: 'select', options: ['openai', 'groq'] },
    { key: 'apiKey', label: 'API key', type: 'password' },
    { key: 'language', label: 'Language (ISO code)', placeholder: 'en' },
  ],
  'translate': [
    { key: 'text', label: 'Text to translate (or use input)', placeholder: 'Hello world', type: 'textarea' },
    { key: 'from', label: 'From (ISO code, or auto)', placeholder: 'auto' },
    { key: 'to', label: 'To (ISO code)', placeholder: 'es' },
  ],
  'sentiment': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['polarity', 'emoji', 'full'] },
  ],
  'summarize': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['extractive', 'bullet', 'one-line', 'headline'] },
    { key: 'sentences', label: 'Sentences (extractive)', placeholder: '3', type: 'number' },
  ],
  'url-screenshot': [
    { key: 'url', label: 'URL', placeholder: 'https://example.com' },
    { key: 'width', label: 'Viewport width', placeholder: '1280', type: 'number' },
    { key: 'height', label: 'Viewport height', placeholder: '720', type: 'number' },
    { key: 'format', label: 'Format', type: 'select', options: ['png', 'jpeg'] },
  ],
  'scheduler': [
    { key: 'cron', label: 'Cron expression', placeholder: '0 9 * * *' },
    { key: 'workflowId', label: 'Workflow to trigger', placeholder: 'workflow uuid or name' },
    { key: 'webhookUrl', label: 'Webhook to fire (optional)', placeholder: 'https://...' },
  ],
  'file-generator': [
    { key: 'mode', label: 'Content mode', type: 'select', options: ['text', 'json', 'dataurl', 'url'] },
    { key: 'filename', label: 'Filename (auto-extension if missing)', placeholder: 'report.txt' },
    { key: 'format', label: 'Format / extension hint', placeholder: 'txt' },
    { key: 'mime', label: 'MIME type (optional)', placeholder: 'application/pdf' },
    { key: 'content', label: 'Content (override upstream)', type: 'textarea', placeholder: 'Paste content here, or wire upstream text into this node' },
  ],
  'read-file-content': [
    { key: 'mode', label: 'Read mode', type: 'select', options: ['auto', 'text', 'dataurl'] },
    { key: 'accept', label: 'Accept filter (comma-separated extensions)', placeholder: '.json,.csv,.txt' },
  ],
  'image-to-file': [
    { key: 'url', label: 'Image URL or data: URL', placeholder: 'https://... or data:image/png;base64,...' },
    { key: 'filename', label: 'Filename (optional, auto-extension if missing)', placeholder: 'output.png' },
  ],
  'markdown-to-html': [
    { key: 'theme', label: 'CSS theme', type: 'select', options: ['default', 'minimal'] },
    { key: 'filename', label: 'Filename', placeholder: 'converted.html' },
    { key: 'includeCss', label: 'Include CSS', type: 'select', options: ['true', 'false'] },
    { key: 'autoDownload', label: 'Auto-download', type: 'select', options: ['true', 'false'] },
    { key: 'markdown', label: 'Markdown content (override upstream)', type: 'textarea', placeholder: '# Title\n\nMarkdown body...' },
  ],
}

export function getManifestConfigFields(toolId: string): ManifestConfigField[] {
  return FIELDS[toolId] ?? []
}
