import { describe, it, expect, vi } from 'vitest'
import { createAgentNode, createToolNode, createChatNode } from '../../src/components/canvas/nodeFactory'

vi.mock('../../src/lib/brainResolver', () => ({
  getDefaultAgentBrain: () => ({
    brain: 'transformers',
    model: 'Xenova/distilgpt2',
  }),
}))

describe('nodeFactory — defaults favor free local brains', () => {
  it('creates agent with free brain defaults', () => {
    const node = createAgentNode({ x: 10, y: 20 })
    expect(node.type).toBe('agent')
    expect(node.data.brain).toBe('transformers')
    expect(node.data.model).toBe('Xenova/distilgpt2')
    expect(node.position).toEqual({ x: 10, y: 20 })
    expect(node.width).toBe(260)
    expect(node.height).toBe(148)
  })

  it('assigns unique incrementing ids across drag-drops', () => {
    const a = createAgentNode({ x: 0, y: 0 })
    const b = createAgentNode({ x: 0, y: 0 })
    expect(a.id).not.toBe(b.id)
  })

  it('creates tool nodes for each browser capability', () => {
    const speech = createToolNode({ x: 0, y: 0 }, 'speech')
    expect(speech.data.toolType).toBe('speech')
    expect(speech.data.label).toBe('Speech')
  })

  it('creates empty chat node ready for first message', () => {
    const chat = createChatNode({ x: 0, y: 0 })
    expect(chat.data.messages).toEqual([])
    expect(chat.data.inputValue).toBe('')
    expect(chat.width).toBe(340)
    expect(chat.height).toBe(240)
  })

  it('creates tool nodes with default dimensions', () => {
    const tool = createToolNode({ x: 0, y: 0 }, 'speech')
    expect(tool.width).toBe(260)
    expect(tool.height).toBe(132)
  })
})
