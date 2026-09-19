import { describe, it, expect } from 'vitest'
import { cronMatches } from '../../worker/index'

// A specific UTC moment: 2026-09-19 16:25:00 (Saturday)
const SAT_1625 = new Date(Date.UTC(2026, 8, 19, 16, 25, 0))
// 2026-09-21 09:00:00 (Monday)
const MON_0900 = new Date(Date.UTC(2026, 8, 21, 9, 0, 0))

describe('worker cronMatches — the scheduler brain', () => {
  it('accepts every-minute and every-5-minute expressions', () => {
    expect(cronMatches('* * * * *', SAT_1625)).toBe(true)
    expect(cronMatches('*/5 * * * *', SAT_1625)).toBe(true) // :25 is divisible by 5
    expect(cronMatches('*/5 * * * *', new Date(Date.UTC(2026, 8, 19, 16, 26, 0)))).toBe(false)
  })

  it('matches exact times', () => {
    expect(cronMatches('25 16 * * *', SAT_1625)).toBe(true)
    expect(cronMatches('0 9 * * *', MON_0900)).toBe(true)
    expect(cronMatches('30 16 * * *', SAT_1625)).toBe(false)
  })

  it('matches weekday ranges', () => {
    // Saturday = 6, Monday = 1
    expect(cronMatches('* * * * 6', SAT_1625)).toBe(true)
    expect(cronMatches('* * * * 0-4', SAT_1625)).toBe(false) // Mon-Fri only
    expect(cronMatches('* * * * 1-5', MON_0900)).toBe(true)
  })

  it('treats 7 as Sunday (cron alias)', () => {
    const sunday = new Date(Date.UTC(2026, 8, 20, 12, 0, 0)) // Sunday
    expect(cronMatches('0 12 * * 7', sunday)).toBe(true)
    expect(cronMatches('0 12 * * 0', sunday)).toBe(true)
    expect(cronMatches('0 12 * * 1', sunday)).toBe(false)
  })

  it('matches lists and ranges with steps', () => {
    expect(cronMatches('0,30 * * * *', SAT_1625)).toBe(false) // :25 not in list
    expect(cronMatches('20-30 * * * *', SAT_1625)).toBe(true)
    expect(cronMatches('10-40/5 * * * *', SAT_1625)).toBe(true) // 25 in range, divisible by step from 10
  })

  it('matches day-of-month and month', () => {
    expect(cronMatches('* * 19 9 *', SAT_1625)).toBe(true)
    expect(cronMatches('* * 19 8 *', SAT_1625)).toBe(false)
    expect(cronMatches('* * 1 * *', SAT_1625)).toBe(false)
  })

  it('dom OR dow when both restricted (standard cron rule)', () => {
    // Sept 19 is Saturday (dow 6); dom 19 also matches; time is 16:25
    expect(cronMatches('25 16 19 9 6', SAT_1625)).toBe(true)
    expect(cronMatches('25 16 1 9 6', SAT_1625)).toBe(true) // dom fails, dow matches
    expect(cronMatches('25 16 19 9 1', SAT_1625)).toBe(true) // dow fails, dom matches
    expect(cronMatches('25 16 1 9 1', SAT_1625)).toBe(false) // both fail
  })

  it('rejects malformed expressions instead of throwing', () => {
    expect(cronMatches('not a cron', SAT_1625)).toBe(false)
    expect(cronMatches('* * * *', SAT_1625)).toBe(false)
    expect(cronMatches('* * * * * *', SAT_1625)).toBe(false)
    expect(cronMatches('', SAT_1625)).toBe(false)
  })
})
