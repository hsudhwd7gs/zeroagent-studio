import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import LaunchTitleSplash from '../../src/components/launch/LaunchTitleSplash'
import { render, screen } from '@testing-library/react'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  }
})

describe('LaunchTitleSplash', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows app title and calls onDone after timeout', async () => {
    const onDone = vi.fn()
    render(<LaunchTitleSplash onDone={onDone} />)
    expect(screen.getByRole('dialog', { name: /Brainwire/i })).toBeInTheDocument()
    expect(screen.getByText('Brainwire')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2800)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('uses shorter timeout when reduced motion is enabled', async () => {
    const { useReducedMotion } = await import('framer-motion')
    vi.mocked(useReducedMotion).mockReturnValue(true)
    const onDone = vi.fn()
    render(<LaunchTitleSplash onDone={onDone} />)
    vi.advanceTimersByTime(800)
    expect(onDone).toHaveBeenCalled()
  })
})
