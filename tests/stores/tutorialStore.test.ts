import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useTutorialStore,
  resetTutorialStorageForTests,
  resetTutorialWorkflowAccessorForTests,
  TUTORIAL_COMPLETED_KEY,
  registerTutorialWorkflowAccessor,
} from '../../src/stores/tutorialStore'
import { makeChat, makeAgent, makeTool } from '../helpers/graphBuilders'

describe('tutorialStore', () => {
  beforeEach(() => {
    resetTutorialStorageForTests()
    useTutorialStore.setState({
      active: false,
      questId: 'snack',
      stepIndex: 0,
      showFinale: false,
      showLaunchSplash: false,
      runAttempted: false,
      runFinished: false,
    })
    registerTutorialWorkflowAccessor(() => ({
      newWorkflow: vi.fn(),
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
    }))
  })

  it('starts quest at step zero and resets canvas by default', () => {
    const newWorkflow = vi.fn()
    registerTutorialWorkflowAccessor(() => ({
      newWorkflow,
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
    }))

    useTutorialStore.getState().start()
    expect(newWorkflow).toHaveBeenCalled()
    expect(useTutorialStore.getState().active).toBe(true)
    expect(useTutorialStore.getState().stepIndex).toBe(0)
  })

  it('starts pipeline quest at step zero', () => {
    useTutorialStore.getState().start({ questId: 'pipeline' })
    expect(useTutorialStore.getState().questId).toBe('pipeline')
    expect(useTutorialStore.getState().stepIndex).toBe(0)
  })

  it('starts encoding quest at step zero', () => {
    useTutorialStore.getState().start({ questId: 'encoding' })
    expect(useTutorialStore.getState().questId).toBe('encoding')
    expect(useTutorialStore.getState().stepIndex).toBe(0)
  })

  it('starts advanced quests at step zero', () => {
    for (const questId of ['writers-room', 'url-detective', 'voice-booth', 'capture-desk'] as const) {
      useTutorialStore.getState().start({ questId })
      expect(useTutorialStore.getState().questId).toBe(questId)
      expect(useTutorialStore.getState().stepIndex).toBe(0)
    }
  })

  it('advances manual steps with next()', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().next()
    expect(useTutorialStore.getState().stepIndex).toBe(1)
  })

  it('skip persists completed flag and deactivates', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().skip()
    expect(useTutorialStore.getState().active).toBe(false)
    expect(localStorage.getItem(TUTORIAL_COMPLETED_KEY)).toBe('1')
  })

  it('complete shows finale and persists', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().complete()
    expect(useTutorialStore.getState().active).toBe(false)
    expect(useTutorialStore.getState().showFinale).toBe(true)
    expect(localStorage.getItem(TUTORIAL_COMPLETED_KEY)).toBe('1')
  })

  it('auto-advances when drag-chat validator passes', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().next() // briefing
    useTutorialStore.getState().next() // mission board -> drag-chat

    useTutorialStore.getState().checkAutoAdvance({
      nodes: [makeChat('c')],
      edges: [],
      workflowName: 'Untitled Workflow',
      isRunning: false,
      connectionRejectionCount: 0,
    })

    expect(useTutorialStore.getState().stepIndex).toBe(3)
  })

  it('tracks execution finish for launch step', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ runAttempted: true })

    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'ok', timestamp: 1 },
    ]

    useTutorialStore.getState().trackExecution(false, [chat])
    expect(useTutorialStore.getState().runFinished).toBe(true)
  })

  it('marks runAttempted when execution starts during quest', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().trackExecution(true, [])
    expect(useTutorialStore.getState().runAttempted).toBe(true)
  })

  it('ignores execution tracking when tutorial inactive', () => {
    useTutorialStore.getState().trackExecution(true, [])
    expect(useTutorialStore.getState().runAttempted).toBe(false)
  })

  it('can start without clearing the canvas', () => {
    const newWorkflow = vi.fn()
    registerTutorialWorkflowAccessor(() => ({
      newWorkflow,
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
    }))
    useTutorialStore.getState().start({ resetCanvas: false })
    expect(newWorkflow).not.toHaveBeenCalled()
  })

  it('auto-advance no-ops on manual steps', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().checkAutoAdvance({
      nodes: [makeChat('c')],
      edges: [],
      workflowName: 'Untitled Workflow',
      isRunning: false,
      connectionRejectionCount: 0,
    })
    expect(useTutorialStore.getState().stepIndex).toBe(0)
  })

  it('auto-advance waits until validator passes on auto steps', () => {
    useTutorialStore.getState().start()
    useTutorialStore.getState().next()
    useTutorialStore.getState().next()
    useTutorialStore.getState().checkAutoAdvance({
      nodes: [],
      edges: [],
      workflowName: 'Untitled Workflow',
      isRunning: false,
      connectionRejectionCount: 0,
    })
    expect(useTutorialStore.getState().stepIndex).toBe(2)
  })

  it('next is ignored when tutorial is inactive', () => {
    useTutorialStore.getState().next()
    expect(useTutorialStore.getState().stepIndex).toBe(0)
  })

  it('does not mark run finished for error assistant replies', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ runAttempted: true })

    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      {
        id: 'msg-1-err',
        role: 'assistant',
        content: 'Could not fetch page',
        timestamp: 1,
      },
    ]

    useTutorialStore.getState().trackExecution(false, [chat])
    expect(useTutorialStore.getState().runFinished).toBe(false)
  })

  it('ignores assistant messages without content', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ runAttempted: true })

    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', timestamp: 1 },
    ]

    useTutorialStore.getState().trackExecution(false, [chat])
    expect(useTutorialStore.getState().runFinished).toBe(false)
  })

  it('does not mark run finished without an assistant message', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ runAttempted: true })
    useTutorialStore.getState().trackExecution(false, [makeChat('c')])
    expect(useTutorialStore.getState().runFinished).toBe(false)
  })

  it('starts safely when workflow accessor is missing', () => {
    resetTutorialWorkflowAccessorForTests()
    expect(() => useTutorialStore.getState().start({ resetCanvas: false })).not.toThrow()
    expect(useTutorialStore.getState().active).toBe(true)
  })

  it('dismissFinale hides splash', () => {
    useTutorialStore.setState({ showFinale: true })
    useTutorialStore.getState().dismissFinale()
    expect(useTutorialStore.getState().showFinale).toBe(false)
  })

  it('next on last step completes quest', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ stepIndex: 10 })
    useTutorialStore.getState().next()
    expect(useTutorialStore.getState().showFinale).toBe(true)
  })

  it('isCompleted reads localStorage', () => {
    expect(useTutorialStore.getState().isCompleted()).toBe(false)
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, '1')
    expect(useTutorialStore.getState().isCompleted()).toBe(true)
  })

  it('migrates legacy tutorial completed flag for snack quest', () => {
    localStorage.setItem('brainwire-tutorial-completed', '1')
    expect(useTutorialStore.getState().isCompleted('snack')).toBe(true)
    expect(localStorage.getItem(TUTORIAL_COMPLETED_KEY)).toBe('1')
    expect(localStorage.getItem('brainwire-tutorial-completed')).toBeNull()
  })

  it('checkAutoAdvance no-ops when tutorial is inactive', () => {
    useTutorialStore.getState().checkAutoAdvance({
      nodes: [makeChat('c')],
      edges: [],
      workflowName: 'Untitled Workflow',
      isRunning: false,
      connectionRejectionCount: 0,
    })
    expect(useTutorialStore.getState().stepIndex).toBe(0)
  })

  it('checkAutoAdvance no-ops when step index is out of range', () => {
    useTutorialStore.setState({ active: true, questId: 'snack', stepIndex: 999 })
    useTutorialStore.getState().checkAutoAdvance({
      nodes: [makeChat('c')],
      edges: [],
      workflowName: 'Untitled Workflow',
      isRunning: false,
      connectionRejectionCount: 0,
    })
    expect(useTutorialStore.getState().stepIndex).toBe(999)
  })

  it('trackExecution marks run finished from text-output capture log', () => {
    useTutorialStore.getState().start({ questId: 'capture-desk' })
    useTutorialStore.setState({ runAttempted: true })
    const output = makeTool('o', 'text-output')
    ;(output.data as { outputLog: { text: string; timestamp: number }[] }).outputLog = [
      { text: 'captured', timestamp: 1 },
    ]
    useTutorialStore.getState().trackExecution(false, [output])
    expect(useTutorialStore.getState().runFinished).toBe(true)
  })

  it('trackExecution marks run finished from agent lastOutput without chat', () => {
    useTutorialStore.getState().start({ questId: 'voice-booth' })
    useTutorialStore.setState({ runAttempted: true })
    const agent = makeAgent('a', { lastOutput: 'spoken line' })
    useTutorialStore.getState().trackExecution(false, [agent])
    expect(useTutorialStore.getState().runFinished).toBe(true)
  })

  it('trackExecution ignores text-output with empty log', () => {
    useTutorialStore.getState().start({ questId: 'capture-desk' })
    useTutorialStore.setState({ runAttempted: true })
    const output = makeTool('o', 'text-output')
    useTutorialStore.getState().trackExecution(false, [output])
    expect(useTutorialStore.getState().runFinished).toBe(false)
  })

  it('trackExecution ignores finish when chat node is missing', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ runAttempted: true })
    useTutorialStore.getState().trackExecution(false, [])
    expect(useTutorialStore.getState().runFinished).toBe(false)
  })

  it('trackExecution ignores finish when run already finished', () => {
    useTutorialStore.getState().start()
    useTutorialStore.setState({ runAttempted: true, runFinished: true })
    const chat = makeChat('c')
    ;(chat.data as { messages: unknown[] }).messages = [
      { id: '1', role: 'assistant', content: 'ok', timestamp: 1 },
    ]
    useTutorialStore.getState().trackExecution(false, [chat])
    expect(useTutorialStore.getState().runFinished).toBe(true)
  })

  it('handles missing localStorage for persistence helpers', () => {
    const storage = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    expect(useTutorialStore.getState().isCompleted()).toBe(false)
    expect(() => useTutorialStore.getState().skip()).not.toThrow()
    expect(() => resetTutorialStorageForTests()).not.toThrow()

    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    })
  })

  it('shows and dismisses launch splash independently from quest finale', () => {
    useTutorialStore.getState().showLaunchSplashAction()
    expect(useTutorialStore.getState().showLaunchSplash).toBe(true)
    useTutorialStore.getState().dismissLaunchSplash()
    expect(useTutorialStore.getState().showLaunchSplash).toBe(false)
  })
})
