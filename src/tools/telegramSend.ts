// Telegram Send — send a message via a Telegram bot.
//
// Setup:
//   1. Create a bot with @BotFather
//   2. Get your chat_id
//   3. Paste both in config
//
// Config:
//   botToken — Telegram bot token (required)
//   chatId   — chat or channel ID (required)
//   text     — message text (falls back to input)
//   parseMode — optional: Markdown | HTML

export async function runTelegramSend(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const botToken = (config.botToken ?? '').trim()
  const chatId = (config.chatId ?? '').trim()
  if (!botToken) throw new Error('botToken is required')
  if (!chatId) throw new Error('chatId is required')

  const text = config.text?.trim() || input.trim()
  if (!text) throw new Error('No message text provided')

  const body: Record<string, string> = { chat_id: chatId, text }
  if (config.parseMode?.trim()) body.parse_mode = config.parseMode.trim()

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Telegram request failed: ${msg}`, { cause: err })
  }

  let text2 = ''
  try {
    text2 = await response.text()
  } catch {
    void 0
  }

  return JSON.stringify(
    {
      ok: response.ok,
      status: response.status,
      response: text2.slice(0, 1000),
    },
    null,
    2
  )
}
