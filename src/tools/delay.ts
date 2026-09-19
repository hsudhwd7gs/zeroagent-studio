// Delay node — async sleep for N ms, then pass through input unchanged.
// Useful for rate-limiting workflows or simulating latency.

export interface DelayConfig {
  ms?: string // delay in milliseconds
}

export async function runDelay(input: string, config: DelayConfig = {}): Promise<string> {
  const ms = Math.max(0, Math.min(60_000, parseInt(config.ms || '1000', 10) || 1000))
  await new Promise((r) => setTimeout(r, ms))
  return input
}
