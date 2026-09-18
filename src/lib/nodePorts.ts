import type { Node } from '@xyflow/react'
import type { PortDef } from './ports'
import { TEXT_IN, TEXT_OUT } from './ports'
import { getTool } from '../tools/registry'
import type { ToolType } from '../tools/registry'

export function getChatPorts(): PortDef[] {
  return [
    {
      id: 'message',
      label: 'Message',
      direction: 'out',
      dataType: 'text',
    },
  ]
}

export function getAgentPorts(): PortDef[] {
  return [
    {
      id: 'context',
      label: 'Context',
      direction: 'in',
      dataType: 'text',
      multiple: true,
    },
    {
      id: 'out',
      label: 'Out',
      direction: 'out',
      dataType: 'text',
    },
  ]
}

export function getLoopPorts(): PortDef[] {
  return [
    {
      id: 'in',
      label: 'Array',
      direction: 'in',
      dataType: 'text',
    },
    {
      id: 'item',
      label: 'Item',
      direction: 'out',
      dataType: 'text',
    },
    {
      id: 'done',
      label: 'Done',
      direction: 'out',
      dataType: 'text',
    },
  ]
}

export function getToolPorts(toolType: ToolType): PortDef[] {
  const tool = getTool(toolType)
  return [...tool.inputs, ...tool.outputs]
}

export function getNodePorts(node: Node): PortDef[] {
  if (node.type === 'chat') return getChatPorts()
  if (node.type === 'agent') return getAgentPorts()
  if (node.type === 'loop') return getLoopPorts()
  if (node.type === 'tool') {
    const toolType = (node.data as { toolType?: ToolType }).toolType
    if (toolType) return getToolPorts(toolType)
  }
  return [TEXT_IN, TEXT_OUT]
}

export function getPortDef(node: Node, handleId: string, handleType: 'source' | 'target'): PortDef | null {
  const ports = getNodePorts(node)
  const direction = handleType === 'source' ? 'out' : 'in'
  return ports.find((p) => p.id === handleId && p.direction === direction) ?? null
}

export function getDefaultSourceHandleForPorts(ports: PortDef[]): string {
  const out = ports.find((p) => p.direction === 'out')
  return out?.id ?? 'out'
}

export function getDefaultSourceHandle(node: Node): string {
  return getDefaultSourceHandleForPorts(getNodePorts(node))
}

export function resolveEdgeSourceHandle(edge: { source: string; sourceHandle?: string | null }, nodes: Node[]): string {
  const sourceNode = nodes.find((n) => n.id === edge.source)
  return edge.sourceHandle ?? (sourceNode ? getDefaultSourceHandle(sourceNode) : 'out')
}

export function resolveEdgeTargetHandle(edge: { target: string; targetHandle?: string | null }, nodes: Node[]): string {
  const targetNode = nodes.find((n) => n.id === edge.target)
  return edge.targetHandle ?? (targetNode ? getDefaultTargetHandle(targetNode) : 'in')
}

export function getDefaultTargetHandle(node: Node): string {
  const ins = getNodePorts(node).filter((p) => p.direction === 'in')
  if (ins.length === 0) return ''
  return ins[0].id
}
