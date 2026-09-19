// Currency Convert node — uses the free, no-key Frankfurter API (ECB rates).

interface FrankfurterResponse {
  rates?: Record<string, number>
  date?: string
}

export async function runCurrencyConvert(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const amount = parseFloat(config.amount ?? input.trim() ?? '1')
  if (isNaN(amount)) throw new Error('amount required (config or input)')
  const from = (config.from ?? 'USD').toUpperCase()
  const to = (config.to ?? 'EUR').toUpperCase()

  const res = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`Frankfurter API failed: ${res.status}`)
  const data = await res.json() as FrankfurterResponse
  return JSON.stringify({
    ok: true,
    amount,
    from,
    to,
    rate: data.rates?.[to],
    converted: data.rates?.[to],
    date: data.date,
  }, null, 2)
}
