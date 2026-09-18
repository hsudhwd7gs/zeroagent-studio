import type { Node, Edge } from '@xyflow/react'
import type {
  AgentNodeData,
  ToolNodeData,
  ChatNodeData,
  LoopNodeData,
  ApiKeys,
  ExecutionContext,
  WorkflowTrigger,
} from '../types'
import { getEngine } from '../engines'
import { resolveAgentBrain } from '../lib/brainResolver'
import { DAG_NO_BRAIN_ERROR } from '../lib/brainChoiceGuidance'
import type { ChatMessage } from '../engines/types'
import {
  getTool,
  isToolAvailableForConfig,
  getToolAvailabilityMessage,
  shouldSkipToolExecution,
  canToolRunWithoutUpstreamInput,
} from '../tools/registry'
import type { ToolType } from '../tools/registry'
import { useDebugStore } from '../stores/debugStore'
import { useExecutionStore } from '../stores/executionStore'
import { useWorkflowStore } from '../stores/workflowStore'
import { textPortValue, type PortValue } from '../lib/ports'
import { mergePortInputValues, truncateForLog, toolSkipMessage, resolveUpstreamPortValue } from '../lib/portMerge'
import { getPrimaryOutputValue } from '../tools/registryHelpers'
import { resolveEdgeSourceHandle, resolveEdgeTargetHandle } from '../lib/nodePorts'
import { collectContextBlocks, formatAgentPrompt } from '../lib/agentContext'
import {
  resolveExecutionScope,
  getReachableNodeIds,
  getDownstreamNodes,
  getUpstreamNodes,
  canRunCaptureSink,
  downstreamClosure,
} from './executionScope'
import { recordEdgeTransfersForNode, setFlowingEdgesForNode } from '../lib/edgeTransfers'
import { getNodeOutputValue } from '../lib/nodeOutputValue'
import { appendOutputLog, parseOutputLogMaxEntries } from '../tools/textOutput'

type LogFn = (entry: {
  level: 'info' | 'warn' | 'error' | 'success' | 'thought'
  source: string
  message: string
  data?: unknown
}) => void

const LOOP_MAX_ITERATIONS = 200
const LOOP_YIELD_EVERY = 10

function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const adjacency = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  nodes.forEach((n) => {
    adjacency.set(n.id, [])
    inDegree.set(n.id, 0)
  })

  edges.forEach((e) => {
    adjacency.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  })

  const queue = nodes.filter((n) => inDegree.get(n.id) === 0)
  const sorted: Node[] = []

  while (queue.length > 0) {
    const node = queue.shift()!
    sorted.push(node)
    for (const neighbor of adjacency.get(node.id)!) {
      const deg = inDegree.get(neighbor)! - 1
      inDegree.set(neighbor, deg)
      if (deg === 0) {
        const n = nodes.find((nd) => nd.id === neighbor)
        if (n) queue.push(n)
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Workflow contains a cycle. Remove circular connections before running.')
  }

  return sorted
}

function formatWorkflowErrors(errors: string[]): string {
  if (errors.length === 0) return ''
  return `\n\n⚠ Some workflow steps failed:\n${errors.map((e) => `• ${e}`).join('\n')}`
}

function getUpstreamEdges(nodeId: string, edges: Edge[]): Edge[] {
  return edges.filter((e) => e.target === nodeId)
}

export const __testOnly = { getNodeOutputValue }

export class DAGOrchestrator {
  private nodes: Node[]
  private edges: Edge[]
  private apiKeys: ApiKeys
  private log: LogFn
  private context: ExecutionContext
  private trigger: WorkflowTrigger | null = null

  constructor(nodes: Node[], edges: Edge[], apiKeys: ApiKeys, log?: LogFn) {
    this.nodes = nodes
    this.edges = edges
    this.apiKeys = apiKeys
    this.log = log ?? (() => {})
    this.context = { variables: {}, toolResults: {}, legacyVariables: {} }
  }

  async executeWithTrigger(trigger: WorkflowTrigger): Promise<string> {
    const executionStore = useExecutionStore.getState()
    const workflowStore = useWorkflowStore.getState()

    executionStore.setRunning(true)
    executionStore.clearThinking()
    executionStore.clearEdgeTransfers()
    executionStore.clearFlowingEdges()
    this.context = { variables: {}, toolResults: {}, legacyVariables: {} }
    this.trigger = trigger

    try {
      if (trigger.kind === 'chat') {
        const chatNode = this.nodes.find((n) => n.id === trigger.nodeId)
        if (!chatNode || chatNode.type !== 'chat') {
          throw new Error('No chat/trigger node found in workflow')
        }
        this.log({
          level: 'info',
          source: 'Orchestrator',
          message: `Starting execution with input: "${trigger.userInput.slice(0, 100)}..."`,
        })
        this.context.variables[chatNode.id] = { message: textPortValue(trigger.userInput) }
        this.context.legacyVariables![chatNode.id] = trigger.userInput
      } else if (trigger.kind === 'sink') {
        const sinkNode = this.nodes.find((n) => n.id === trigger.nodeId)
        if (!sinkNode || sinkNode.type !== 'tool') {
          throw new Error('No capture tool node found in workflow')
        }
        const sinkData = sinkNode.data as ToolNodeData
        if (sinkData.toolType !== 'text-output') {
          throw new Error('Run capture is only available on Text Output blocks')
        }
        const label = sinkData.label || sinkNode.id
        this.log({
          level: 'info',
          source: 'Orchestrator',
          message: `Starting capture run into "${label}"`,
        })
      } else if (trigger.kind === 'tool') {
        const toolNode = this.nodes.find((n) => n.id === trigger.nodeId)
        if (!toolNode || toolNode.type !== 'tool') {
          throw new Error('No tool trigger node found in workflow')
        }
        const label = (toolNode.data as ToolNodeData).label || toolNode.id
        this.log({
          level: 'info',
          source: 'Orchestrator',
          message: `Starting execution from tool "${label}"`,
        })
      } else if (trigger.kind === 'loop') {
        const loopNode = this.nodes.find((n) => n.id === trigger.nodeId)
        if (!loopNode || loopNode.type !== 'loop') {
          throw new Error('No loop trigger node found in workflow')
        }
        const label = (loopNode.data as LoopNodeData).label || loopNode.id
        this.log({
          level: 'info',
          source: 'Orchestrator',
          message: `Starting execution from loop "${label}"`,
        })
      } else {
        const agentNode = this.nodes.find((n) => n.id === trigger.nodeId)
        if (!agentNode || agentNode.type !== 'agent') {
          throw new Error('No agent trigger node found in workflow')
        }
        this.log({
          level: 'info',
          source: 'Orchestrator',
          message: `Starting execution from agent "${(agentNode.data as AgentNodeData).label || agentNode.id}"`,
        })
      }

      const scope = resolveExecutionScope(trigger, this.nodes, this.edges)
      const sorted = topologicalSort(this.nodes, this.edges).filter((n) => scope.has(n.id))
      const nodeErrors: string[] = []
      let finalOutput = trigger.kind === 'chat' ? trigger.userInput : ''
      let lastAgentOutput = ''

      const loopHandledNodes = new Set<string>()

      for (const node of sorted) {
        if (loopHandledNodes.has(node.id)) continue

        if (trigger.kind === 'chat' && node.id === trigger.nodeId && node.type === 'chat') {
          continue
        }

        // ─── LOOP NODE HANDLING ────────────────────────────────
        if (node.type === 'loop') {
          executionStore.clearFlowingEdges()
          executionStore.setCurrentNode(node.id)
          executionStore.addThinkingNode(node.id)
          setFlowingEdgesForNode(node.id, this.edges)
          workflowStore.updateNodeData(node.id, {
            isThinking: true,
          } as Partial<LoopNodeData>)

          try {
            const loopOutput = await this.executeLoop(node, sorted, loopHandledNodes)
            if (loopOutput) finalOutput = loopOutput
            workflowStore.updateNodeData(node.id, {
              isThinking: false,
              lastOutput: loopOutput,
            } as Partial<LoopNodeData>)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            const label = (node.data as LoopNodeData).label || node.id
            nodeErrors.push(`${label}: ${message}`)
            this.log({ level: 'error', source: label, message })
            workflowStore.updateNodeData(node.id, {
              isThinking: false,
              lastOutput: `Error: ${message}`,
            } as Partial<LoopNodeData>)
          } finally {
            executionStore.removeThinkingNode(node.id)
          }
          continue
        }
        // ─── END LOOP NODE HANDLING ───────────────────────────

        executionStore.clearFlowingEdges()
        executionStore.setCurrentNode(node.id)
        executionStore.addThinkingNode(node.id)
        setFlowingEdgesForNode(node.id, this.edges)
        workflowStore.updateNodeData(node.id, {
          isThinking: true,
          isActive: node.type === 'tool',
        } as Partial<AgentNodeData>)

        try {
          const output = await this.executeNode(node)
          if (output) finalOutput = output
          if (node.type === 'agent' && output) {
            lastAgentOutput = output
          }

          if (node.type === 'agent') {
            workflowStore.updateNodeData(node.id, {
              isThinking: false,
              isActive: false,
              lastOutput: output,
            } as Partial<AgentNodeData>)
          } else if (node.type === 'tool') {
            workflowStore.updateNodeData(node.id, {
              isThinking: false,
              isActive: false,
              lastOutput: output,
            } as Partial<ToolNodeData>)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const label = (node.data as AgentNodeData | ToolNodeData).label || node.id
          nodeErrors.push(`${label}: ${message}`)
          this.log({ level: 'error', source: label, message })
          if (node.type === 'agent') {
            workflowStore.updateNodeData(node.id, {
              isThinking: false,
              isActive: false,
              lastOutput: `Error: ${message}`,
            } as Partial<AgentNodeData>)
          } else {
            workflowStore.updateNodeData(node.id, {
              isThinking: false,
              isActive: false,
              lastOutput: `Error: ${message}`,
            } as Partial<ToolNodeData>)
          }
        } finally {
          executionStore.removeThinkingNode(node.id)
        }
      }

      if (sorted.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
      executionStore.clearFlowingEdges()

      const chatReplyBase =
        trigger.kind === 'chat' && lastAgentOutput ? lastAgentOutput : finalOutput
      const outputWithErrors = chatReplyBase + formatWorkflowErrors(nodeErrors)

      if (trigger.kind === 'chat') {
        const storeNodes = useWorkflowStore.getState().nodes ?? this.nodes
        const freshChat = storeNodes.find((n) => n.id === trigger.nodeId)
        const chatMessages =
          (freshChat?.data as ChatNodeData | undefined)?.messages ??
          (this.nodes.find((n) => n.id === trigger.nodeId)?.data as ChatNodeData).messages ??
          []

        const assistantMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant' as const,
          content: outputWithErrors,
          timestamp: Date.now(),
        }

        workflowStore.updateNodeData(trigger.nodeId, {
          messages: [...chatMessages, assistantMessage],
          isRunning: false,
        } as Partial<ChatNodeData>)
      }

      this.log({
        level: nodeErrors.length > 0 ? 'warn' : 'success',
        source: 'Orchestrator',
        message:
          nodeErrors.length > 0 ? 'Workflow finished with errors' : 'Workflow execution completed',
      })
      return outputWithErrors
    } finally {
      executionStore.setRunning(false)
      executionStore.setCurrentNode(null)
      this.trigger = null
    }
  }

  private async executeLoop(
    loopNode: Node,
    sorted: Node[],
    loopHandled: Set<string>
  ): Promise<string> {
    const data = loopNode.data as LoopNodeData
    const config = data.config ?? {}

    const inputs = this.getPortInputs(loopNode.id, ['in'])
    const rawInput = inputs['in']?.value ?? this.context.legacyVariables?.[loopNode.id] ?? ''

    let items: unknown[]
    try {
      const parsed = JSON.parse(rawInput)
      if (!Array.isArray(parsed)) {
        throw new Error('Loop input must be a JSON array')
      }
      items = parsed
    } catch (err) {
      throw new Error(
        `Loop: invalid input — ${err instanceof Error ? err.message : String(err)}`,
        { cause: err }
      )
    }

    if (items.length === 0) {
      this.log({
        level: 'warn',
        source: data.label || loopNode.id,
        message: 'Loop: empty array, nothing to iterate',
      })
      return '[]'
    }

    const downstream = sorted.filter(
      (n) => n.id !== loopNode.id && this.isDownstreamOf(n.id, loopNode.id)
    )

    if (downstream.length === 0) {
      throw new Error('Loop: no downstream nodes connected to iterate')
    }

    const terminal = downstream[downstream.length - 1]

    const maxIterations = Math.min(
      Math.max(1, Number(config.maxIterations ?? LOOP_MAX_ITERATIONS)),
      LOOP_MAX_ITERATIONS
    )
    const iterations = Math.min(items.length, maxIterations)

    if (items.length > maxIterations) {
      this.log({
        level: 'warn',
        source: data.label || loopNode.id,
        message: `Loop capped at ${maxIterations} iterations (input had ${items.length})`,
      })
    }

    this.log({
      level: 'info',
      source: data.label || loopNode.id,
      message: `Loop: ${iterations} iterations × ${downstream.length} downstream nodes`,
    })

    useWorkflowStore.getState().updateNodeData(loopNode.id, {
      totalIterations: iterations,
      currentIteration: 0,
    } as Partial<LoopNodeData>)

    const results: string[] = []

    for (let i = 0; i < iterations; i++) {
      const item = items[i]

      const itemText =
        typeof item === 'string' ? item : JSON.stringify(item, null, 2)

      this.context.variables[loopNode.id] = {
        item: textPortValue(itemText),
      }
      this.context.legacyVariables![loopNode.id] = itemText

      useWorkflowStore.getState().updateNodeData(loopNode.id, {
        currentIteration: i + 1,
      } as Partial<LoopNodeData>)

      if (i > 0 && i % LOOP_YIELD_EVERY === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      for (const dn of downstream) {
        useExecutionStore.getState().setCurrentNode(dn.id)
        useExecutionStore.getState().addThinkingNode(dn.id)
        setFlowingEdgesForNode(dn.id, this.edges)

        try {
          await this.executeNode(dn)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          this.log({
            level: 'error',
            source: `Loop iter ${i + 1} · ${(dn.data as { label?: string }).label || dn.id}`,
            message: msg,
          })
        } finally {
          useExecutionStore.getState().removeThinkingNode(dn.id)
        }
      }

      const terminalOutput = this.context.legacyVariables?.[terminal.id] ?? ''
      results.push(terminalOutput)
    }

    for (const dn of downstream) {
      loopHandled.add(dn.id)
    }

    const finalJson = JSON.stringify(results, null, 2)
    this.context.variables[loopNode.id] = {
      done: textPortValue(finalJson),
    }
    this.context.legacyVariables![loopNode.id] = finalJson

    this.log({
      level: 'success',
      source: data.label || loopNode.id,
      message: `Loop finished: ${iterations} iterations, ${results.length} results`,
    })

    return finalJson
  }

  private isDownstreamOf(nodeId: string, ancestorId: string): boolean {
    const visited = new Set<string>()
    const stack = [ancestorId]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      visited.add(current)
      const outgoing = this.edges.filter((e) => e.source === current)
      for (const e of outgoing) {
        if (e.target === nodeId) return true
        stack.push(e.target)
      }
    }
    return false
  }

  /** @deprecated Use executeWithTrigger — kept for tests */
  async execute(userInput: string, startNodeId?: string): Promise<string> {
    const chatNode = startNodeId
      ? this.nodes.find((n) => n.id === startNodeId)
      : this.nodes.find((n) => n.type === 'chat')

    if (!chatNode) {
      throw new Error('No chat/trigger node found in workflow')
    }

    return this.executeWithTrigger({
      kind: 'chat',
      nodeId: chatNode.id,
      userInput,
    })
  }

  private getPortInputs(nodeId: string, inputPortIds: string[]): Record<string, PortValue> {
    const inputs: Record<string, PortValue> = {}
    const upstreamEdges = getUpstreamEdges(nodeId, this.edges)

    for (const portId of inputPortIds) {
      const matching = upstreamEdges.filter((e) => resolveEdgeTargetHandle(e, this.nodes) === portId)

      if (matching.length === 0) continue

      const values = matching.map((e) => {
        const sourceHandle = resolveEdgeSourceHandle(e, this.nodes)
        const fromTool = this.context.toolResults[e.source]?.[sourceHandle]
        const fromVar = this.context.variables[e.source]?.[sourceHandle]
        return resolveUpstreamPortValue(
          fromTool,
          fromVar,
          textPortValue(getNodeOutputValue(e.source, this.context, sourceHandle))
        )
      })

      inputs[portId] = mergePortInputValues(values)
    }

    if (Object.keys(inputs).length === 0) {
      const legacy = upstreamEdges
        .map((e) => getNodeOutputValue(e.source, this.context))
        .filter(Boolean)
        .join('\n\n')
      if (legacy && inputPortIds[0]) {
        inputs[inputPortIds[0]] = textPortValue(legacy)
      }
    }

    return inputs
  }

  private storeNodeOutput(
    nodeId: string,
    outputs: Record<string, PortValue>,
    isTool: boolean
  ): string {
    const primary = getPrimaryOutputValue(outputs)
    if (isTool) {
      this.context.toolResults[nodeId] = outputs
    } else {
      this.context.variables[nodeId] = outputs
    }
    this.context.legacyVariables![nodeId] = primary
    return primary
  }

  private async executeNode(node: Node): Promise<string> {
    switch (node.type) {
      case 'agent':
        return this.executeAgent(node)
      case 'tool':
        return this.executeTool(node)
      case 'chat':
        return this.context.legacyVariables?.[node.id] ?? ''
      case 'loop':
        return this.context.legacyVariables?.[node.id] ?? ''
      default:
        return ''
    }
  }

  private async executeAgent(node: Node): Promise<string> {
    const data = node.data as AgentNodeData
    const blocks = collectContextBlocks(
      node.id,
      this.nodes,
      this.edges,
      this.context,
      this.trigger!
    )
    recordEdgeTransfersForNode(node.id, ['context', 'in'], this.nodes, this.edges, this.context)
    const prompt = formatAgentPrompt(data.role, blocks)

    this.log({
      level: 'thought',
      source: data.label || node.id,
      message: `Agent "${data.role}" processing...`,
      data: { brain: data.brain, input: prompt.slice(0, 200) },
    })

    const resolved = resolveAgentBrain(data.brain, this.apiKeys, data.model)

    if (resolved.fallbackNote) {
      this.log({
        level: 'warn',
        source: data.label || node.id,
        message: resolved.fallbackNote,
      })
    }

    const engine = getEngine(resolved.brain, this.apiKeys)
    const available = await engine.isAvailable()

    if (!available) {
      throw new Error(DAG_NO_BRAIN_ERROR)
    }

    const messages: ChatMessage[] = []
    if (data.systemPrompt) {
      messages.push({ role: 'system', content: data.systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    this.log({
      level: 'info',
      source: data.label || node.id,
      message: `Calling ${engine.name}...`,
      data: { requested: data.brain, using: resolved.brain, model: resolved.model },
    })

    const result = await engine.chat(messages, {
      model: resolved.model ?? data.model,
      onModelRetry: (from, to, error) => {
        this.log({
          level: 'info',
          source: data.label || node.id,
          message: `${engine.name}: ${from} unavailable, trying ${to}…`,
          data: { error: truncateForLog(error) },
        })
      },
    })

    this.log({
      level: 'success',
      source: data.label || node.id,
      message: `Response received (${result.content.length} chars)`,
      data: { model: result.model, usage: result.usage },
    })

    this.log({
      level: 'thought',
      source: data.label || node.id,
      message: result.content.slice(0, 500) + (result.content.length > 500 ? '...' : ''),
    })

    return this.storeNodeOutput(node.id, { out: textPortValue(result.content) }, false)
  }

  private async executeTool(node: Node): Promise<string> {
    const data = node.data as ToolNodeData
    const tool = getTool(data.toolType as ToolType)
    const inputPortIds = tool.inputs.map((p) => p.id)
    const portInputs = this.getPortInputs(node.id, inputPortIds)
    const config = data.config ?? {}

    const skip = shouldSkipToolExecution(data, tool, portInputs)
    if (skip.skip) {
      this.log({
        level: 'warn',
        source: data.label || node.id,
        message: toolSkipMessage(skip.reason),
      })
      workflowStoreUpdateSkipped(node.id)
      return ''
    }

    this.log({
      level: 'info',
      source: data.label || node.id,
      message: `Running tool: ${tool.id}`,
    })

    if (!isToolAvailableForConfig(tool, this.apiKeys, config)) {
      throw new Error(getToolAvailabilityMessage(tool, this.apiKeys, config) || 'Tool unavailable')
    }

    recordEdgeTransfersForNode(node.id, inputPortIds, this.nodes, this.edges, this.context)

    const ctx = {
      apiKeys: this.apiKeys,
      log: (level: 'info' | 'warn' | 'error', message: string) => {
        this.log({ level, source: data.label || node.id, message })
      },
    }

    const outputs = await tool.run(portInputs, config, ctx)
    const primary = this.storeNodeOutput(node.id, outputs, true)

    if (tool.id === 'text-output' && primary.trim()) {
      const storeNodes = useWorkflowStore.getState().nodes ?? this.nodes
      const fresh = storeNodes.find((n) => n.id === node.id)
      const currentLog = (fresh?.data as ToolNodeData | undefined)?.outputLog ?? data.outputLog
      const updatedLog = appendOutputLog(
        currentLog,
        primary,
        Date.now(),
        parseOutputLogMaxEntries(config)
      )
      useWorkflowStore.getState().updateNodeData(node.id, {
        outputLog: updatedLog,
      } as Partial<ToolNodeData>)
    }

    this.log({
      level: 'success',
      source: data.label || node.id,
      message: `Tool completed (${primary.length} chars output)`,
    })

    return primary
  }
}

function workflowStoreUpdateSkipped(nodeId: string): void {
  useWorkflowStore.getState().updateNodeData(nodeId, {
    isThinking: false,
    isActive: false,
  } as Partial<ToolNodeData>)
}

export async function runWorkflow(
  nodes: Node[],
  edges: Edge[],
  userInput: string,
  apiKeys: ApiKeys
): Promise<string> {
  const chatNode = nodes.find((n) => n.type === 'chat')
  if (!chatNode) {
    throw new Error('No chat/trigger node found in workflow')
  }
  const log = useDebugStore.getState().addLog
  const orchestrator = new DAGOrchestrator(nodes, edges, apiKeys, log)
  return orchestrator.executeWithTrigger({
    kind: 'chat',
    nodeId: chatNode.id,
    userInput,
  })
}

export async function runWorkflowFromAgent(
  nodes: Node[],
  edges: Edge[],
  agentNodeId: string,
  apiKeys: ApiKeys
): Promise<string> {
  const agentNode = nodes.find((n) => n.id === agentNodeId && n.type === 'agent')
  if (!agentNode) {
    throw new Error('No agent trigger node found in workflow')
  }
  const log = useDebugStore.getState().addLog
  const orchestrator = new DAGOrchestrator(nodes, edges, apiKeys, log)
  return orchestrator.executeWithTrigger({ kind: 'agent', nodeId: agentNodeId })
}

export async function runWorkflowFromTool(
  nodes: Node[],
  edges: Edge[],
  toolNodeId: string,
  apiKeys: ApiKeys
): Promise<string> {
  const toolNode = nodes.find((n) => n.id === toolNodeId && n.type === 'tool')
  if (!toolNode) {
    throw new Error('No tool trigger node found in workflow')
  }
  const data = toolNode.data as ToolNodeData
  const tool = getTool(data.toolType)
  if (!isToolAvailableForConfig(tool, apiKeys, data.config)) {
    throw new Error('Configure API keys or settings before running this workflow')
  }
  if (!canToolRunWithoutUpstreamInput(tool, data.config)) {
    throw new Error('This tool needs upstream input or configuration before it can start a workflow')
  }
  if (downstreamClosure(toolNodeId, edges).size === 0) {
    throw new Error('Wire this tool downstream before running the workflow')
  }
  const log = useDebugStore.getState().addLog
  const orchestrator = new DAGOrchestrator(nodes, edges, apiKeys, log)
  return orchestrator.executeWithTrigger({ kind: 'tool', nodeId: toolNodeId })
}

export async function runWorkflowFromLoop(
  nodes: Node[],
  edges: Edge[],
  loopNodeId: string,
  apiKeys: ApiKeys
): Promise<string> {
  const loopNode = nodes.find((n) => n.id === loopNodeId && n.type === 'loop')
  if (!loopNode) {
    throw new Error('No loop trigger node found in workflow')
  }
  const log = useDebugStore.getState().addLog
  const orchestrator = new DAGOrchestrator(nodes, edges, apiKeys, log)
  return orchestrator.executeWithTrigger({ kind: 'loop', nodeId: loopNodeId })
}

export async function runWorkflowToSink(
  nodes: Node[],
  edges: Edge[],
  sinkNodeId: string,
  apiKeys: ApiKeys
): Promise<string> {
  const sinkNode = nodes.find((n) => n.id === sinkNodeId && n.type === 'tool')
  if (!sinkNode) {
    throw new Error('No capture tool node found in workflow')
  }
  const sinkData = sinkNode.data as ToolNodeData
  if (sinkData.toolType !== 'text-output') {
    throw new Error('Run capture is only available on Text Output blocks')
  }
  if (!canRunCaptureSink(sinkNodeId, nodes, edges)) {
    throw new Error(
      'Run capture needs a tool-only upstream chain — send from Chat when Chat or Agent is upstream'
    )
  }
  const log = useDebugStore.getState().addLog
  const orchestrator = new DAGOrchestrator(nodes, edges, apiKeys, log)
  return orchestrator.executeWithTrigger({ kind: 'sink', nodeId: sinkNodeId })
}

export function getExecutionOrder(nodes: Node[], edges: Edge[]): Node[] {
  return topologicalSort(nodes, edges)
}

export { getUpstreamNodes, getDownstreamNodes, getReachableNodeIds }
