import type { Node } from '@xyflow/react'
import { createAgentNode, createChatNode, createToolNode } from '../components/canvas/nodeFactory'
import { paletteDragTypeToToolId } from '../tools/registry'
import { useWorkflowStore } from '../stores/workflowStore'
import type { LoopNodeData, TerminalNodeData } from '../types'

let loopCounter = 0
let terminalCounter = 0

function createLoopNode(position: { x: number; y: number }): Node {
  loopCounter += 1
  const id = `loop-${Date.now()}-${loopCounter}-${Math.random().toString(36).slice(2, 8)}`

  const data: LoopNodeData = {
    label: 'Loop',
    config: { maxIterations: '200' },
  }

  return {
    id,
    type: 'loop',
    position,
    width: 260,
    height: 168,
    data,
  }
}

function createTerminalNode(position: { x: number; y: number }): Node {
  terminalCounter += 1
  const id = `terminal-${Date.now()}-${terminalCounter}-${Math.random().toString(36).slice(2, 8)}`

  const data: TerminalNodeData = {
    label: 'Terminal',
    history: [],
    inputValue: '',
  }

  return {
    id,
    type: 'terminal',
    position,
    width: 420,
    height: 280,
    data,
  }
}

export function createNodeFromPaletteType(
  type: string,
  position: { x: number; y: number }
): Node | null {
  switch (type) {
    case 'agent':
      return createAgentNode(position)
    case 'chat':
      return createChatNode(position)
    case 'loop':
      return createLoopNode(position)
    case 'terminal':
      return createTerminalNode(position)
    default: {
      const toolId = paletteDragTypeToToolId(type)
      if (!toolId) return null
      return createToolNode(position, toolId)
    }
  }
}

export function addPaletteNodeAt(type: string, position: { x: number; y: number }): boolean {
  const node = createNodeFromPaletteType(type, position)
  if (!node) return false
  useWorkflowStore.getState().addNode(node)
  return true
}
