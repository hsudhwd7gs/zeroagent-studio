// Markdown to HTML — converts markdown to a styled, self-contained HTML file
// with optional CSS theme, then triggers a browser download.

interface MdToHtmlResult {
  ok: boolean
  html: string
  filename: string
  size: number
  downloadUrl?: string
}

const DEFAULT_CSS = `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 760px;
  margin: 40px auto;
  padding: 0 20px;
  line-height: 1.65;
  color: #1a1a2e;
  background: #fafafa;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 2.2em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
h2 { font-size: 1.7em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.2em; }
code {
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 16px 20px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.85em;
  line-height: 1.55;
}
pre code { background: transparent; padding: 0; color: inherit; }
blockquote {
  border-left: 4px solid #8b5cf6;
  margin: 1em 0;
  padding: 0.5em 1.2em;
  background: #faf5ff;
  color: #4c1d95;
}
table { border-collapse: collapse; margin: 1em 0; }
th, td { border: 1px solid #d1d5db; padding: 6px 12px; }
th { background: #f3f4f6; font-weight: 600; }
a { color: #7c3aed; text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; border-radius: 4px; }
hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2em 0; }
`

export async function runMarkdownToHtml(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const markdown = config.markdown?.trim() || input.trim()
  if (!markdown) throw new Error('markdown content required (wire upstream text or set markdown config)')

  const theme = config.theme ?? 'default'
  const includeCss = config.includeCss !== 'false'
  const autoDownload = config.autoDownload !== 'false'

  // Convert markdown → HTML using marked (dynamic CDN import)
  const markedUrl = 'https://esm.sh/marked@13.0.3'
  const markedMod = await import(/* @vite-ignore */ markedUrl)
  const marked = markedMod.marked ?? markedMod.default ?? markedMod
  const htmlBody = marked.parse(markdown) as string

  const css = includeCss ? (theme === 'minimal' ? '' : DEFAULT_CSS) : ''
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(extractFirstHeading(markdown) || 'Markdown')}</title>
<style>${css}</style>
</head>
<body>
${htmlBody}
</body>
</html>`

  let filename = config.filename?.trim() || 'converted.html'
  if (!filename.endsWith('.html')) filename = `${filename}.html`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const result: MdToHtmlResult = {
    ok: true,
    html,
    filename,
    size: blob.size,
  }

  if (autoDownload) {
    const downloadUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      a.remove()
      URL.revokeObjectURL(downloadUrl)
    }, 1000)
    result.downloadUrl = downloadUrl
  }

  return JSON.stringify(result, null, 2)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function extractFirstHeading(md: string): string | null {
  const match = md.match(/^#\s+(.+?)$/m)
  return match?.[1] ?? null
}
