import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  runCustomScript,
  validateCustomScript,
  CUSTOM_SCRIPT_MAX_BYTES,
  CUSTOM_SCRIPT_HELPERS,
} from '../../src/tools/customScript'

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null

  postMessage(data: { code: string; input: string; config: Record<string, string> }) {
    queueMicrotask(async () => {
      try {
        const fn = new Function(
          'input',
          'config',
          'helpers',
          'return (async () => {\n' + data.code + '\n})()'
        )
        const result = await fn(data.input, data.config, CUSTOM_SCRIPT_HELPERS)
        this.onmessage?.({
          data: { ok: true, result: result == null ? '' : String(result) },
        } as MessageEvent)
      } catch (err) {
        this.onmessage?.({
          data: {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          },
        } as MessageEvent)
      }
    })
  }

  terminate() {}
}

describe('customScript', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('validates empty script', () => {
    expect(() => validateCustomScript('')).toThrow(/empty/)
  })

  it('validates script size', () => {
    const huge = 'x'.repeat(CUSTOM_SCRIPT_MAX_BYTES + 1)
    expect(() => validateCustomScript(huge)).toThrow(/KB limit/)
  })

  it('runs script in worker and returns string', async () => {
    const result = await runCustomScript('hello', {
      script: 'return helpers.trim(input)',
    })
    expect(result).toBe('hello')
  })

  it('surfaces script errors', async () => {
    await expect(
      runCustomScript('x', { script: 'throw new Error("boom")' })
    ).rejects.toThrow(/boom/)
  })

  it('uses config.script default when missing', async () => {
    await expect(runCustomScript('x', {})).rejects.toThrow(/empty/)
  })

  it('handles worker message edge cases', async () => {
    class NullResultWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage() {
        this.onmessage?.({ data: { ok: true, result: undefined } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', NullResultWorker)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    await expect(runCustomScript('x', { script: 'return null' })).resolves.toBe('')

    class FailWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage() {
        this.onmessage?.({ data: { ok: false } } as MessageEvent)
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', FailWorker)
    await expect(runCustomScript('x', { script: 'bad' })).rejects.toThrow(/Custom script failed/)
  })

  it('times out long-running scripts', async () => {
    vi.useFakeTimers()
    class SlowWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      postMessage() {
        /* never responds */
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', SlowWorker)
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    const pending = runCustomScript('x', { script: 'while(true){}' })
    const assertion = expect(pending).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(600_001)
    await assertion
    vi.useRealTimers()
  })

  it('handles worker errors', async () => {
    class ErrorWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: (() => void) | null = null
      postMessage() {
        this.onerror?.()
      }
      terminate() {}
    }
    vi.stubGlobal('Worker', ErrorWorker)
    await expect(runCustomScript('x', { script: 'return 1' })).rejects.toThrow(/worker error/)
  })
})
