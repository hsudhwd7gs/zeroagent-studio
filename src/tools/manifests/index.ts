import type { PortDef } from '../../lib/ports'
import { JSON_IN, JSON_OUT, TEXT_IN, TEXT_OUT } from '../../lib/ports'
import type { ToolPaletteGroup, ToolRequirement } from '../registryTypes'

export type ManifestEngine =
  | 'string'
  | 'encoding'
  | 'hash'
  | 'json'
  | 'list'
  | 'math'
  | 'date'
  | 'validate'
  | 'flow'
  | 'regex'
  | 'generate'
  | 'html'
  | 'markdown'
  | 'csv'
  | 'compare'

export type BrowserSubcategory =
  | 'text'
  | 'encoding'
  | 'json'
  | 'list'
  | 'math'
  | 'date'
  | 'validate'
  | 'flow'
  | 'regex'
  | 'generate'
  | 'html'
  | 'markdown'
  | 'csv'
  | 'compare'

export interface ToolManifestEntry {
  id: string
  label: string
  description: string
  icon: string
  engine: ManifestEngine
  preset: string
  paletteGroup: ToolPaletteGroup
  browserSubcategory?: BrowserSubcategory
  requirement?: ToolRequirement
  inputs?: PortDef[]
  outputs?: PortDef[]
}

export const DEFAULT_TEXT_IO: { inputs: PortDef[]; outputs: PortDef[] } = {
  inputs: [TEXT_IN],
  outputs: [TEXT_OUT],
}

export const DEFAULT_JSON_IO: { inputs: PortDef[]; outputs: PortDef[] } = {
  inputs: [JSON_IN],
  outputs: [JSON_OUT],
}

function textTool(
  id: string,
  label: string,
  description: string,
  icon: string,
  engine: ManifestEngine,
  preset: string,
  sub: BrowserSubcategory
): ToolManifestEntry {
  return {
    id,
    label,
    description,
    icon,
    engine,
    preset,
    paletteGroup: 'browser',
    browserSubcategory: sub,
    ...DEFAULT_TEXT_IO,
  }
}

export const MANIFEST_TOOLS: ToolManifestEntry[] = [
  // String (18)
  textTool('trim-text', 'Trim Text', 'Remove leading and trailing whitespace', '✂️', 'string', 'trim', 'text'),
  textTool('uppercase', 'Uppercase', 'Convert text to UPPERCASE', '🔠', 'string', 'upper', 'text'),
  textTool('lowercase', 'Lowercase', 'Convert text to lowercase', '🔡', 'string', 'lower', 'text'),
  textTool('slugify', 'Slugify', 'URL-friendly slug from text', '🔗', 'string', 'slug', 'text'),
  textTool('reverse-text', 'Reverse Text', 'Reverse character order', '↩️', 'string', 'reverse', 'text'),
  textTool('word-count', 'Word Count', 'Count words in text', '🔢', 'string', 'word-count', 'text'),
  textTool('line-count', 'Line Count', 'Count lines in text', '📏', 'string', 'line-count', 'text'),
  textTool('char-count', 'Char Count', 'Count characters', '📝', 'string', 'char-count', 'text'),
  textTool('pad-start', 'Pad Start', 'Pad start to length', '⬅️', 'string', 'pad-start', 'text'),
  textTool('pad-end', 'Pad End', 'Pad end to length', '➡️', 'string', 'pad-end', 'text'),
  textTool('collapse-spaces', 'Collapse Spaces', 'Collapse whitespace runs', '🗜️', 'string', 'collapse-spaces', 'text'),
  textTool('title-case', 'Title Case', 'Capitalize Each Word', '📰', 'string', 'title-case', 'text'),
  textTool('snake-case', 'Snake Case', 'Convert to snake_case', '🐍', 'string', 'snake-case', 'text'),
  textTool('kebab-case', 'Kebab Case', 'Convert to kebab-case', '🍢', 'string', 'kebab-case', 'text'),
  textTool('camel-case', 'Camel Case', 'Convert to camelCase', '🐫', 'string', 'camel-case', 'text'),
  textTool('truncate-text', 'Truncate', 'Truncate to max length', '✂️', 'string', 'truncate', 'text'),
  textTool('repeat-text', 'Repeat Text', 'Repeat input N times', '🔁', 'string', 'repeat', 'text'),
  textTool('remove-empty-lines', 'Remove Empty Lines', 'Drop blank lines', '🧹', 'string', 'remove-empty-lines', 'text'),

  // Encoding (12)
  textTool('base64-encode', 'Base64 Encode', 'Encode text to Base64', '🔐', 'encoding', 'base64-encode', 'encoding'),
  textTool('base64-decode', 'Base64 Decode', 'Decode Base64 to text', '🔓', 'encoding', 'base64-decode', 'encoding'),
  textTool('url-encode', 'URL Encode', 'Percent-encode for URLs', '🌐', 'encoding', 'url-encode', 'encoding'),
  textTool('url-decode', 'URL Decode', 'Decode percent-encoded text', '🌐', 'encoding', 'url-decode', 'encoding'),
  textTool('html-encode', 'HTML Encode', 'Escape HTML entities', '📄', 'encoding', 'html-encode', 'encoding'),
  textTool('html-decode', 'HTML Decode', 'Unescape HTML entities', '📄', 'encoding', 'html-decode', 'encoding'),
  textTool('hex-encode', 'Hex Encode', 'Text to hexadecimal', '🔢', 'encoding', 'hex-encode', 'encoding'),
  textTool('hex-decode', 'Hex Decode', 'Hexadecimal to text', '🔢', 'encoding', 'hex-decode', 'encoding'),
  textTool('unicode-escape', 'Unicode Escape', 'Escape non-ASCII as \\u', '🔤', 'encoding', 'unicode-escape', 'encoding'),
  textTool('unicode-unescape', 'Unicode Unescape', 'Decode \\u sequences', '🔤', 'encoding', 'unicode-unescape', 'encoding'),
  textTool('rot13', 'ROT13', 'Classic ROT13 cipher', '🔄', 'encoding', 'rot13', 'encoding'),
  textTool('binary-encode', 'Binary Encode', 'Text to binary bytes', '01', 'encoding', 'binary-encode', 'encoding'),

  // Hash (4)
  textTool('sha-256', 'SHA-256', 'SHA-256 hash (hex)', '🔒', 'hash', 'sha-256', 'encoding'),
  textTool('sha-1', 'SHA-1', 'SHA-1 hash (hex)', '🔒', 'hash', 'sha-1', 'encoding'),
  textTool('sha-384', 'SHA-384', 'SHA-384 hash (hex)', '🔒', 'hash', 'sha-384', 'encoding'),
  textTool('sha-512', 'SHA-512', 'SHA-512 hash (hex)', '🔒', 'hash', 'sha-512', 'encoding'),

  // JSON (11)
  {
    id: 'json-pretty',
    label: 'JSON Pretty',
    description: 'Pretty-print JSON',
    icon: '{ }',
    engine: 'json',
    preset: 'pretty',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    ...DEFAULT_JSON_IO,
    outputs: [TEXT_OUT],
  },
  {
    id: 'json-minify',
    label: 'JSON Minify',
    description: 'Minify JSON',
    icon: '{ }',
    engine: 'json',
    preset: 'minify',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    inputs: [JSON_IN],
    outputs: [TEXT_OUT],
  },
  {
    id: 'json-get-path',
    label: 'JSON Get Path',
    description: 'Extract field by dot path',
    icon: '{ }',
    engine: 'json',
    preset: 'get-path',
    paletteGroup: 'browser',
    browserSubcategory: 'json',
    inputs: [JSON_IN],
    outputs: [TEXT_OUT],
  },
  textTool('json-keys', 'JSON Keys', 'List object keys', '🗝️', 'json', 'keys', 'json'),
  textTool('json-values', 'JSON Values', 'List object values', '📦', 'json', 'values', 'json'),
  textTool('json-type-check', 'JSON Type', 'Return JSON value type', '🏷️', 'json', 'type-check', 'json'),
  textTool('json-stringify', 'JSON Stringify', 'Wrap text as JSON string', '📎', 'json', 'stringify-string', 'json'),
  textTool('json-parse-string', 'JSON Parse String', 'Parse JSON string value', '📎', 'json', 'parse-string', 'json'),
  textTool('json-array-length', 'JSON Array Length', 'Length of JSON array', '📊', 'json', 'array-length', 'json'),
  textTool('json-is-array', 'Is JSON Array', 'true if input is JSON array', '✓', 'json', 'is-array', 'json'),
  textTool('json-is-object', 'Is JSON Object', 'true if input is JSON object', '✓', 'json', 'is-object', 'json'),

  // List (12)
  textTool('split-lines', 'Split Lines', 'Split on newlines with separator', '📋', 'list', 'split-lines', 'list'),
  textTool('join-lines', 'Join Lines', 'Join lines with separator', '📋', 'list', 'join-lines', 'list'),
  textTool('dedupe-lines', 'Dedupe Lines', 'Remove duplicate lines', '🧹', 'list', 'dedupe-lines', 'list'),
  textTool('sort-lines', 'Sort Lines', 'Sort lines A–Z', '🔤', 'list', 'sort-lines', 'list'),
  textTool('sort-lines-desc', 'Sort Lines Desc', 'Sort lines Z–A', '🔤', 'list', 'sort-lines-desc', 'list'),
  textTool('reverse-lines', 'Reverse Lines', 'Reverse line order', '↕️', 'list', 'reverse-lines', 'list'),
  textTool('head-lines', 'Head Lines', 'First N lines', '⬆️', 'list', 'head', 'list'),
  textTool('tail-lines', 'Tail Lines', 'Last N lines', '⬇️', 'list', 'tail', 'list'),
  textTool('nth-line', 'Nth Line', 'Pick line by index', '🎯', 'list', 'nth-line', 'list'),
  textTool('filter-empty-lines', 'Filter Empty Lines', 'Keep non-empty lines', '🧹', 'list', 'filter-empty', 'list'),
  textTool('numbered-lines', 'Number Lines', 'Prefix lines with numbers', '🔢', 'list', 'numbered-lines', 'list'),
  textTool('shuffle-lines', 'Shuffle Lines', 'Randomize line order', '🎲', 'list', 'shuffle-lines', 'list'),

  // Math (10)
  textTool('math-eval', 'Math Eval', 'Evaluate safe math expression', '🔢', 'math', 'eval', 'math'),
  textTool('math-round', 'Round', 'Round to nearest integer', '🔢', 'math', 'round', 'math'),
  textTool('math-floor', 'Floor', 'Round down', '🔢', 'math', 'floor', 'math'),
  textTool('math-ceil', 'Ceil', 'Round up', '🔢', 'math', 'ceil', 'math'),
  textTool('math-abs', 'Absolute', 'Absolute value', '🔢', 'math', 'abs', 'math'),
  textTool('math-sqrt', 'Square Root', 'Square root', '√', 'math', 'sqrt', 'math'),
  textTool('math-min', 'Minimum', 'Min of input and B', '🔢', 'math', 'min', 'math'),
  textTool('math-max', 'Maximum', 'Max of input and B', '🔢', 'math', 'max', 'math'),
  textTool('math-percent', 'Percent Of', 'Percent of number', '%', 'math', 'percent', 'math'),
  textTool('math-mod', 'Modulo', 'Remainder mod B', '🔢', 'math', 'mod', 'math'),

  // Date (8)
  textTool('now-iso', 'Now ISO', 'Current time as ISO string', '🕐', 'date', 'now-iso', 'date'),
  textTool('now-unix', 'Now Unix', 'Current Unix timestamp', '🕐', 'date', 'now-unix', 'date'),
  textTool('format-date', 'Format Date', 'Format date for locale', '📅', 'date', 'format', 'date'),
  textTool('parse-iso-date', 'Parse ISO Date', 'Parse ISO to ISO', '📅', 'date', 'parse-iso', 'date'),
  textTool('add-days', 'Add Days', 'Add days to date', '➕', 'date', 'add-days', 'date'),
  textTool('diff-days', 'Diff Days', 'Day difference between dates', '📊', 'date', 'diff-days', 'date'),
  textTool('to-utc', 'To UTC', 'Convert to UTC string', '🌍', 'date', 'to-utc', 'date'),
  textTool('weekday', 'Weekday', 'Day of week name', '📆', 'date', 'weekday', 'date'),

  // Validate (8)
  textTool('is-json', 'Is Valid JSON', 'true if parseable JSON', '✓', 'validate', 'is-json', 'validate'),
  textTool('is-url', 'Is URL', 'true if valid http(s) URL', '✓', 'validate', 'is-url', 'validate'),
  textTool('is-email', 'Is Email', 'true if email-like', '✓', 'validate', 'is-email', 'validate'),
  textTool('matches-regex', 'Matches Regex', 'true if pattern matches', '✓', 'validate', 'matches-regex', 'validate'),
  textTool('not-empty', 'Not Empty', 'true if non-empty text', '✓', 'validate', 'not-empty', 'validate'),
  textTool('is-number', 'Is Number', 'true if finite number', '✓', 'validate', 'is-number', 'validate'),
  textTool('is-integer', 'Is Integer', 'true if integer', '✓', 'validate', 'is-integer', 'validate'),
  textTool('in-range', 'In Range', 'true if number in min–max', '✓', 'validate', 'in-range', 'validate'),

  // Flow (6)
  textTool('pass-through', 'Pass Through', 'Forward input unchanged', '➡️', 'flow', 'pass-through', 'flow'),
  textTool('default-if-empty', 'Default If Empty', 'Use default when empty', '🔄', 'flow', 'default-if-empty', 'flow'),
  textTool('template', 'Template', 'Replace {{input}} in template', '📝', 'flow', 'template', 'flow'),
  textTool('add-prefix', 'Add Prefix', 'Prepend prefix to text', '⬅️', 'flow', 'prefix', 'flow'),
  textTool('add-suffix', 'Add Suffix', 'Append suffix to text', '➡️', 'flow', 'suffix', 'flow'),
  textTool('merge-lines-flow', 'Merge Lines', 'Join lines with separator', '🔗', 'flow', 'merge-lines', 'flow'),

  // Phase 1 expansion — String (+8)
  textTool('extract-urls', 'Extract URLs', 'Pull http(s) links from text', '🔗', 'string', 'extract-urls', 'text'),
  textTool('extract-emails', 'Extract Emails', 'Pull email addresses from text', '📧', 'string', 'extract-emails', 'text'),
  textTool('split-words', 'Split Words', 'One word per line', '✂️', 'string', 'split-words', 'text'),
  textTool('join-words', 'Join Words', 'Join lines into words', '🔗', 'string', 'join-words', 'text'),
  textTool('replace-all', 'Replace All', 'Find and replace all occurrences', '🔄', 'string', 'replace-all', 'text'),
  textTool('normalize-spaces', 'Normalize Spaces', 'Unicode-normalize and collapse spaces', '🗜️', 'string', 'normalize-spaces', 'text'),
  textTool('strip-bom', 'Strip BOM', 'Remove UTF-8 BOM character', '🧹', 'string', 'strip-bom', 'text'),
  textTool('indent-lines', 'Indent Lines', 'Prefix every line', '➡️', 'string', 'indent-lines', 'text'),

  // Encoding (+4)
  textTool('base64url-encode', 'Base64URL Encode', 'URL-safe Base64 encode', '🔐', 'encoding', 'base64url-encode', 'encoding'),
  textTool('base64url-decode', 'Base64URL Decode', 'URL-safe Base64 decode', '🔓', 'encoding', 'base64url-decode', 'encoding'),
  textTool('jwt-decode', 'JWT Decode', 'Decode JWT payload (no verify)', '🪪', 'encoding', 'jwt-decode', 'encoding'),
  textTool('crc32', 'CRC32', 'CRC32 checksum (hex)', '🔢', 'encoding', 'crc32', 'encoding'),

  // Hash (+1)
  textTool('md5', 'MD5', 'MD5 hash for dedup only', '🔒', 'hash', 'md5', 'encoding'),

  // JSON (+6)
  // NOTE: json-merge and json-flatten are intentionally NOT defined here —
  // richer curated versions already own those ids in CURATED_TOOLS
  // (deep merge with mode option, delimiter-aware flatten). Registering them
  // again duplicated the palette entries and shadowed the better tools.
  textTool('json-set-path', 'JSON Set Path', 'Set value at dot path', '✏️', 'json', 'set-path', 'json'),
  textTool('json-delete-path', 'JSON Delete Path', 'Remove key at dot path', '🗑️', 'json', 'delete-path', 'json'),
  textTool('json-pick-keys', 'JSON Pick Keys', 'Keep only listed keys', '🗝️', 'json', 'pick-keys', 'json'),
  textTool('json-omit-keys', 'JSON Omit Keys', 'Remove listed keys', '🚫', 'json', 'omit-keys', 'json'),
  textTool('json-sort-keys', 'JSON Sort Keys', 'Sort object keys A–Z', '🔤', 'json', 'sort-keys', 'json'),
  textTool('json-wrap-array', 'JSON Wrap Array', 'Wrap value in array', '📦', 'json', 'wrap-array', 'json'),

  // List (+8)
  textTool('grep-lines', 'Grep Lines', 'Keep lines matching regex', '🔍', 'list', 'grep-lines', 'list'),
  textTool('grep-lines-inverse', 'Grep Inverse', 'Drop lines matching regex', '🔍', 'list', 'grep-lines-inverse', 'list'),
  textTool('count-lines-matching', 'Count Matching', 'Count regex-matching lines', '🔢', 'list', 'count-matching', 'list'),
  textTool('unique-lines', 'Unique Lines', 'Dedupe trimmed lines', '🧹', 'list', 'unique-lines', 'list'),
  textTool('group-by-prefix', 'Group By Prefix', 'Bucket lines by prefix', '📂', 'list', 'group-by-prefix', 'list'),
  textTool('zip-lines', 'Zip Lines', 'Merge with second list', '🔗', 'list', 'zip-lines', 'list'),
  textTool('enumerate-lines', 'Enumerate Lines', 'Prefix lines with index', '🔢', 'list', 'enumerate-lines', 'list'),
  textTool('sample-lines', 'Sample Lines', 'Random N lines', '🎲', 'list', 'sample-lines', 'list'),

  // Math (+5)
  textTool('math-clamp', 'Clamp', 'Clamp number to range', '🔢', 'math', 'clamp', 'math'),
  textTool('math-sum-lines', 'Sum Lines', 'Sum numbers line by line', '➕', 'math', 'sum-lines', 'math'),
  textTool('math-avg-lines', 'Average Lines', 'Average of line numbers', '📊', 'math', 'avg-lines', 'math'),
  textTool('format-number', 'Format Number', 'Locale number format', '🔢', 'math', 'format-number', 'math'),
  textTool('parse-number', 'Parse Number', 'Extract finite number', '🔢', 'math', 'parse-number', 'math'),

  // Date (+5)
  textTool('add-hours', 'Add Hours', 'Add hours to date', '⏰', 'date', 'add-hours', 'date'),
  textTool('add-minutes', 'Add Minutes', 'Add minutes to date', '⏱️', 'date', 'add-minutes', 'date'),
  textTool('start-of-day', 'Start Of Day', 'Midnight on date', '🌅', 'date', 'start-of-day', 'date'),
  textTool('relative-days', 'Relative Days', 'Date with day offset label', '📆', 'date', 'relative-days', 'date'),
  textTool('is-before-date', 'Is Before Date', 'true if date is earlier', '✓', 'date', 'is-before', 'date'),

  // Validate (+8)
  textTool('is-uuid', 'Is UUID', 'true if UUID format', '✓', 'validate', 'is-uuid', 'validate'),
  textTool('is-ipv4', 'Is IPv4', 'true if IPv4 address', '✓', 'validate', 'is-ipv4', 'validate'),
  textTool('is-hex', 'Is Hex', 'true if hex string', '✓', 'validate', 'is-hex', 'validate'),
  textTool('is-base64', 'Is Base64', 'true if Base64-like', '✓', 'validate', 'is-base64', 'validate'),
  textTool('min-length', 'Min Length', 'true if long enough', '✓', 'validate', 'min-length', 'validate'),
  textTool('max-length', 'Max Length', 'true if short enough', '✓', 'validate', 'max-length', 'validate'),
  textTool('contains-text', 'Contains Text', 'true if substring found', '✓', 'validate', 'contains', 'validate'),
  textTool('equals-ignore-case', 'Equals Ignore Case', 'Case-insensitive compare', '✓', 'validate', 'equals-ignore-case', 'validate'),

  // Flow (+5)
  textTool('coalesce', 'Coalesce', 'First non-empty section', '🔄', 'flow', 'coalesce', 'flow'),
  textTool('wrap-text', 'Wrap Text', 'Word-wrap to width', '📝', 'flow', 'wrap-text', 'flow'),
  textTool('truncate-words', 'Truncate Words', 'Limit word count', '✂️', 'flow', 'truncate-words', 'flow'),
  textTool('if-empty', 'If Empty', 'Message when input empty', '💬', 'flow', 'if-empty', 'flow'),
  textTool('line-template', 'Line Template', 'Template per line', '📝', 'flow', 'line-template', 'flow'),

  // Regex (+8)
  textTool('regex-extract-first', 'Regex Extract First', 'First regex match', '🔍', 'regex', 'extract-first', 'regex'),
  textTool('regex-extract-all', 'Regex Extract All', 'All regex matches', '🔍', 'regex', 'extract-all', 'regex'),
  textTool('regex-replace', 'Regex Replace', 'Regex find and replace', '🔄', 'regex', 'replace', 'regex'),
  textTool('regex-split', 'Regex Split', 'Split on regex', '✂️', 'regex', 'split', 'regex'),
  textTool('regex-test', 'Regex Test', 'true if pattern matches', '✓', 'regex', 'test', 'regex'),
  textTool('regex-capture-groups', 'Regex Groups', 'Capture groups as JSON', '📦', 'regex', 'capture-groups', 'regex'),
  textTool('regex-escape', 'Regex Escape', 'Escape regex metacharacters', '🛡️', 'regex', 'escape', 'regex'),
  textTool('regex-extract-emails', 'Regex Emails', 'Extract emails via regex', '📧', 'regex', 'extract-emails', 'regex'),

  // Generate (+8)
  textTool('uuid-v4', 'UUID v4', 'Random UUID', '🆔', 'generate', 'uuid-v4', 'generate'),
  textTool('random-int', 'Random Int', 'Random integer in range', '🎲', 'generate', 'random-int', 'generate'),
  textTool('random-string', 'Random String', 'Random alphanumeric string', '🎲', 'generate', 'random-string', 'generate'),
  textTool('random-hex', 'Random Hex', 'Random hex bytes', '🎲', 'generate', 'random-hex', 'generate'),
  textTool('timestamp-id', 'Timestamp ID', 'Sortable timestamp id', '🕐', 'generate', 'timestamp-id', 'generate'),
  textTool('nonce', 'Nonce', 'Random nonce hex', '🔑', 'generate', 'nonce', 'generate'),
  textTool('pick-random-line', 'Pick Random Line', 'Random line from input', '🎲', 'generate', 'pick-line', 'generate'),
  textTool('lorem-ipsum', 'Lorem Ipsum', 'Placeholder text', '📝', 'generate', 'lorem', 'generate'),

  // HTML (+8)
  textTool('html-to-text', 'HTML To Text', 'Visible text from HTML', '🌐', 'html', 'to-text', 'html'),
  textTool('html-strip-tags', 'Strip HTML Tags', 'Remove tags roughly', '🧹', 'html', 'strip-tags', 'html'),
  textTool('html-extract-links', 'HTML Extract Links', 'All anchor hrefs', '🔗', 'html', 'extract-links', 'html'),
  textTool('html-extract-title', 'HTML Title', 'Page title tag', '📄', 'html', 'extract-title', 'html'),
  textTool('html-extract-meta', 'HTML Meta', 'Meta tag content', '🏷️', 'html', 'extract-meta', 'html'),
  textTool('html-extract-images', 'HTML Images', 'Image src URLs', '🖼️', 'html', 'extract-images', 'html'),
  textTool('html-unescape', 'HTML Unescape', 'Decode HTML entities', '🔓', 'html', 'unescape-entities', 'html'),
  textTool('html-table-to-lines', 'HTML Table To Lines', 'Table rows as TSV', '📊', 'html', 'table-to-lines', 'html'),

  // Markdown (+8)
  textTool('md-to-text', 'Markdown To Text', 'Plain text from markdown', '📝', 'markdown', 'to-text', 'markdown'),
  textTool('md-strip', 'Strip Markdown', 'Remove markdown formatting', '🧹', 'markdown', 'strip', 'markdown'),
  textTool('md-extract-headings', 'MD Headings', 'Extract heading lines', '📰', 'markdown', 'extract-headings', 'markdown'),
  textTool('md-extract-links', 'MD Links', 'Extract markdown links', '🔗', 'markdown', 'extract-links', 'markdown'),
  textTool('md-extract-code', 'MD Code Blocks', 'Extract fenced code', '💻', 'markdown', 'extract-code', 'markdown'),
  textTool('md-to-bullets', 'MD To Bullets', 'Lines as bullet list', '•', 'markdown', 'to-bullets', 'markdown'),
  textTool('md-word-count', 'MD Word Count', 'Words in markdown', '🔢', 'markdown', 'word-count', 'markdown'),
  textTool('md-read-time', 'MD Read Time', 'Estimated reading time', '⏱️', 'markdown', 'read-time', 'markdown'),

  // CSV (+8)
  textTool('csv-parse-header', 'CSV Headers', 'First row column names', '📋', 'csv', 'parse-header', 'csv'),
  textTool('csv-to-json-rows', 'CSV To JSON', 'Rows as JSON array', '{ }', 'csv', 'to-json-rows', 'csv'),
  textTool('csv-from-json-row', 'JSON Row To CSV', 'Single object to CSV row', '📋', 'csv', 'from-json-row', 'csv'),
  textTool('csv-select-column', 'CSV Select Column', 'One column as lines', '📊', 'csv', 'select-column', 'csv'),
  textTool('csv-filter-rows', 'CSV Filter Rows', 'Rows where column contains', '🔍', 'csv', 'filter-rows', 'csv'),
  textTool('csv-sort-rows', 'CSV Sort Rows', 'Sort by column', '🔤', 'csv', 'sort-rows', 'csv'),
  textTool('csv-dedupe-rows', 'CSV Dedupe Rows', 'Unique rows by column', '🧹', 'csv', 'dedupe-rows', 'csv'),
  textTool('tsv-to-csv', 'TSV To CSV', 'Convert tab-separated to CSV', '🔄', 'csv', 'tsv-to-csv', 'csv'),

  // Compare (+6)
  textTool('text-equals', 'Text Equals', 'true if equal to other', '✓', 'compare', 'equals', 'compare'),
  textTool('text-contains', 'Text Contains', 'true if contains other', '✓', 'compare', 'contains', 'compare'),
  textTool('text-starts-with', 'Starts With', 'true if starts with other', '✓', 'compare', 'starts-with', 'compare'),
  textTool('text-ends-with', 'Ends With', 'true if ends with other', '✓', 'compare', 'ends-with', 'compare'),
  textTool('line-diff-count', 'Line Diff Count', 'Count differing lines', '📊', 'compare', 'line-diff-count', 'compare'),
  textTool('similarity-ratio', 'Similarity', 'Levenshtein similarity %', '📈', 'compare', 'similarity', 'compare'),
]
