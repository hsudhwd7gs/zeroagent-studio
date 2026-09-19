import type { Node, Edge } from '@xyflow/react'
import type { ToolType } from '../tools/registry'

export type { ToolType } from '../tools/registry'

export type BrainType = 'local' | 'transformers' | 'openrouter' | 'groq' | 'gemini'

export interface AgentNodeData extends Record<string, unknown> {
  label: string
  role: string
  systemPrompt: string
  brain: BrainType
  model?: string
  isThinking?: boolean
  lastOutput?: string
  locked?: boolean
}

export interface OutputLogEntry {
  text: string
  timestamp: number
}

export interface ToolNodeData extends Record<string, unknown> {
  label: string
  toolType: ToolType
  config?: Record<string, string>
  autoRun?: boolean
  isActive?: boolean
  isThinking?: boolean
  lastOutput?: string
  outputLog?: OutputLogEntry[]
  locked?: boolean
}

export interface LoopNodeData extends Record<string, unknown> {
  label: string
  config?: Record<string, string>
  isThinking?: boolean
  lastOutput?: string
  currentIteration?: number
  totalIterations?: number
  locked?: boolean
}

export type WorkflowTrigger =
  | { kind: 'chat'; nodeId: string; userInput: string }
  | { kind: 'agent'; nodeId: string }
  | { kind: 'tool'; nodeId: string }
  | { kind: 'sink'; nodeId: string }
  | { kind: 'loop'; nodeId: string }

export interface ChatNodeData extends Record<string, unknown> {
  label: string
  messages: ChatMessage[]
  inputValue?: string
  isRunning?: boolean
  locked?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export type WorkflowNode = Node<AgentNodeData | ToolNodeData | ChatNodeData | LoopNodeData>
export type WorkflowEdge = Edge

export interface Workflow {
  id?: number
  name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: number
  updatedAt: number
  /** Phase C: links workflow to a project (local). Default 'personal'. */
  projectId?: string
}

/** Phase C: a project = a workspace grouping multiple workflows + per-project settings. */
export interface Project {
  id: string
  name: string
  /** Hex color used for the project chip in the switcher. */
  color: string
  /** Optional emoji/letter shown in the chip. */
  emoji?: string
  createdAt: number
  updatedAt: number
}

/** The default project that every user starts with. Cannot be deleted. */
export const DEFAULT_PROJECT_ID = 'personal'
export const DEFAULT_PROJECT: Project = {
  id: DEFAULT_PROJECT_ID,
  name: 'Personal',
  color: '#8b5cf6',
  emoji: '★',
  createdAt: 0,
  updatedAt: 0,
}

export interface ApiKeys {
  openrouter?: string
  groq?: string
  gemini?: string
}

export interface DebugLogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'success' | 'thought'
  source: string
  message: string
  data?: unknown
}

export interface ExecutionContext {
  variables: Record<string, Record<string, import('../lib/ports').PortValue>>
  toolResults: Record<string, Record<string, import('../lib/ports').PortValue>>
  legacyVariables?: Record<string, string>
}
