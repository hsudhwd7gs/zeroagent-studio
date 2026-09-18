import type { Node } from '@xyflow/react'

export type WorkflowNodeType = 'agent' | 'tool' | 'chat' | 'loop'

export interface NodeSize {
  width: number
  height: number
}

export interface NodeResizeLimits extends NodeSize {
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
}

const NODE_DEFAULTS: Record<WorkflowNodeType, NodeSize> = {
  chat: { width: 340, height: 240 },
  agent: { width: 260, height: 148 },
  tool: { width: 260, height: 132 },
  loop: { width: 260, height: 168 },
}

const NODE_LIMITS: Record<WorkflowNodeType, NodeResizeLimits> = {
  chat: {
    ...NODE_DEFAULTS.chat,
    minWidth: 280,
    minHeight: 168,
    maxWidth: 520,
    maxHeight: 480,
  },
  agent: {
    ...NODE_DEFAULTS.agent,
    minWidth: 200,
    minHeight: 108,
    maxWidth: 480,
    maxHeight: 400,
  },
  tool: {
    ...NODE_DEFAULTS.tool,
    minWidth: 200,
    minHeight: 100,
    maxWidth: 480,
    maxHeight: 400,
  },
  loop: {
    ...NODE_DEFAULTS.loop,
    minWidth: 220,
    minHeight: 140,
    maxWidth: 520,
    maxHeight: 480,
  },
}

export function resolveWorkflowNodeType(type: string | undefined): WorkflowNodeType {
  if (type === 'agent' || type === 'tool' || type === 'chat' || type === 'loop') return type
  return 'tool'
}

export function getDefaultNodeSize(type: string | undefined): NodeSize {
  return NODE_DEFAULTS[resolveWorkflowNodeType(type)]
}

export function getNodeResizeLimits(type: string | undefined): NodeResizeLimits {
  return NODE_LIMITS[resolveWorkflowNodeType(type)]
}

export function ensureNodeDimensions(node: Node): Node {
  const defaults = getDefaultNodeSize(node.type)
  const width = typeof node.width === 'number' && node.width > 0 ? node.width : defaults.width
  const height = typeof node.height === 'number' && node.height > 0 ? node.height : defaults.height
  if (node.width === width && node.height === height) return node
  return { ...node, width, height }
}
