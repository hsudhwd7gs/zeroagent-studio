import { useShallow } from 'zustand/react/shallow'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useExecutionStore } from '../../stores/executionStore'
import type { AgentNodeData, ChatNodeData, LoopNodeData, ToolNodeData } from '../../types'
import { runWorkflowFromAgent } from '../../orchestrator/dag'
import {
  getCachedOpenRouterFreeModels,
} from '../../engines/openrouter'
import { GROQ_MODELS } from '../../engines/groq'
import { GEMINI_MODELS } from '../../engines/gemini'
import { AVAILABLE_LOCAL_MODELS } from '../../engines/webllm'
import { TRANSFORMERS_MODELS } from '../../engines/transformers'
import { getBrainCostLabel } from '../../lib/brainResolver'
import { getBrainSetupMessage, listBrainOptions } from '../../lib/brainSetup'
import { AUTO_ROTATE_MODEL, OPENROUTER_FREE_ROUTER } from '../../lib/modelRotation'
import { getChatPorts, getAgentPorts, getLoopPorts } from '../../lib/nodePorts'
import { BaseInspectorShell } from './BaseInspectorShell'
import { PortLegend } from './PortLegend'
import { ToolInspectorFields } from './ToolInspectorFields'
import { InspectorSetupNotice } from './InspectorSetupNotice'
import EdgeInspector from './EdgeInspector'

function getModelsForBrain(brain: AgentNodeData['brain']): string[] {
  switch (brain) {
    case 'local':
      return AVAILABLE_LOCAL_MODELS
    case 'transformers':
      return TRANSFORMERS_MODELS
    case 'groq':
      return [AUTO_ROTATE_MODEL, ...GROQ_MODELS]
    case 'gemini':
      return [AUTO_ROTATE_MODEL, ...GEMINI_MODELS]
    case 'openrouter':
      return [OPENROUTER_FREE_ROUTER, ...getCachedOpenRouterFreeModels()]
    default:
      return [AUTO_ROTATE_MODEL, ...getCachedOpenRouterFreeModels()]
  }
}

function resolveInspectorModel(
  brain: AgentNodeData['brain'],
  model: string | undefined,
  models: string[]
): string {
  if (brain === 'openrouter' && (!model || model === AUTO_ROTATE_MODEL)) {
    return OPENROUTER_FREE_ROUTER
  }
  return model ?? models[0] ?? ''
}

function modelLabel(model: string): string {
  if (model === AUTO_ROTATE_MODEL) return 'Auto (rotate on rate limit)'
  if (model === OPENROUTER_FREE_ROUTER) return 'Auto (rotate free models)'
  return model
}

export default function NodeInspector() {
  const selectedEdge = useWorkflowStore((s) => s.edges.find((e) => e.selected) ?? null)
  const selectedNode = useWorkflowStore(
    useShallow((s) => {
      const node = s.nodes.find((n) => n.selected)
      if (!node) return null
      return { id: node.id, type: node.type, data: node.data }
    })
  )
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const isRunning = useExecutionStore((s) => s.isRunning)

  if (selectedEdge) {
    return <EdgeInspector edge={selectedEdge} />
  }

  if (!selectedNode) {
    return (
      <aside className="sidebar inspector">
        <h3 className="sidebar-title">Block settings</h3>
        <div className="inspector-empty-state">
          <span className="inspector-empty-icon" aria-hidden>
            ◇
          </span>
          <p className="inspector-empty-title">Nothing selected</p>
          <p className="inspector-empty">
            Click a block or connector on the canvas. Connectors show the exact payload that last flowed
            through the wire.
          </p>
        </div>
      </aside>
    )
  }

  if (selectedNode.type === 'chat') {
    const data = selectedNode.data as ChatNodeData
    const messageCount = data.messages?.length ?? 0

    return (
      <BaseInspectorShell
        title="Chat settings"
        nodeId={selectedNode.id}
        nodeType="chat"
        label={data.label || 'Chat'}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      >
        <p className="inspector-summary">
          {messageCount} message{messageCount === 1 ? '' : 's'} in history. Type and send on the
          canvas. Your message is always sent to Agents — even in serial tool chains.
        </p>
        <PortLegend inputs={[]} outputs={getChatPorts()} />
      </BaseInspectorShell>
    )
  }

  if (selectedNode.type === 'agent') {
    const data = selectedNode.data as AgentNodeData
    const brainOptions = listBrainOptions(apiKeys)
    const brainSetupMessage = getBrainSetupMessage(data.brain, apiKeys)
    const brainAvailable = !brainSetupMessage
    const models = brainAvailable ? getModelsForBrain(data.brain) : []
    const currentModel = brainAvailable
      ? resolveInspectorModel(data.brain, data.model, models)
      : ''

    return (
      <BaseInspectorShell
        title="Agent settings"
        nodeId={selectedNode.id}
        nodeType="agent"
        label={data.label}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      >
        <PortLegend inputs={getAgentPorts().filter((p) => p.direction === 'in')} outputs={getAgentPorts().filter((p) => p.direction === 'out')} />
        <p className="inspector-hint">
          <strong>Context</strong> accepts multiple wires. Your Chat message is always included when you send.
        </p>
        <button
          type="button"
          className="inspector-action-btn"
          data-tutorial-target="inspector-run-agent"
          disabled={isRunning}
          onClick={() => void runWorkflowFromAgent(nodes, edges, selectedNode.id, apiKeys)}
        >
          {isRunning ? 'Running…' : 'Run workflow'}
        </button>
        <span className="inspector-hint">
          Use when there is no Chat block, or to re-run this agent&apos;s upstream chain.
        </span>
        <label>
          Role
          <input
            data-tutorial-target="inspector-role"
            value={data.role}
            onChange={(e) => updateNodeData(selectedNode.id, { role: e.target.value })}
            placeholder="e.g. Patient tutor"
          />
          <span className="inspector-hint">Short job title the AI sees</span>
        </label>
        <label>
          AI engine
          <select
            value={data.brain}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                brain: e.target.value as AgentNodeData['brain'],
                model: undefined,
              })
            }
          >
            {brainOptions.map((opt) => (
              <option key={opt.brain} value={opt.brain} disabled={!opt.available}>
                {opt.optionLabel}
                {!opt.available ? ' — locked' : ''}
              </option>
            ))}
          </select>
          <span className="inspector-hint">{getBrainCostLabel(data.brain)}</span>
        </label>
        {brainSetupMessage && (
          <InspectorSetupNotice
            message={brainSetupMessage}
            onOpenPrivacyKeys={() => openSettings('keys')}
            onOpenPrivacy={
              data.brain === 'openrouter' || data.brain === 'groq' || data.brain === 'gemini'
                ? () => openSettings('privacy')
                : undefined
            }
          />
        )}
        {brainAvailable &&
          (data.brain === 'openrouter' || data.brain === 'groq' || data.brain === 'gemini') && (
          <aside className="inspector-safety inspector-safety--cloud" aria-label="Cloud AI privacy notice">
            <p className="inspector-safety-title">Cloud engine — data leaves your browser</p>
            <p className="inspector-safety-summary">
              Everything wired into this Agent (files, web pages, clipboard text) is sent to your chosen
              provider using your API key. Open <strong>Privacy &amp; keys → Privacy &amp; cloud providers</strong> for
              official per-provider settings and risks. Do not send secrets you would not paste into their chat.
            </p>
          </aside>
        )}
        <label>
          Model version
          <select
            value={currentModel}
            disabled={!brainAvailable}
            onChange={(e) => updateNodeData(selectedNode.id, { model: e.target.value })}
          >
            {brainAvailable ? (
              models.map((m) => (
                <option key={m} value={m}>
                  {modelLabel(m)}
                </option>
              ))
            ) : (
              <option value="">Locked — configure engine above first</option>
            )}
          </select>
          <span className="inspector-hint">
            {!brainAvailable
              ? 'Models unlock when the selected engine is configured'
              : data.brain === 'openrouter'
                ? 'Auto rotates between free models when one hits a limit'
                : 'Smaller = faster on weak laptops'}
          </span>
        </label>
        <label>
          Instructions (system prompt)
          <textarea
            rows={5}
            value={data.systemPrompt}
            onChange={(e) => updateNodeData(selectedNode.id, { systemPrompt: e.target.value })}
            placeholder="How should this agent behave? Tone, rules, format…"
          />
          <span className="inspector-hint">This is the most important field — be specific</span>
        </label>
      </BaseInspectorShell>
    )
  }

  if (selectedNode.type === 'tool') {
    return (
      <ToolInspectorFields
        key={selectedNode.id}
        nodeId={selectedNode.id}
        data={selectedNode.data as ToolNodeData}
        updateNodeData={updateNodeData}
      />
    )
  }

  if (selectedNode.type === 'loop') {
    const data = selectedNode.data as LoopNodeData
    const iterations = data.totalIterations ?? 0
    const current = data.currentIteration ?? 0

    return (
      <BaseInspectorShell
        title="Loop settings"
        nodeId={selectedNode.id}
        nodeType="loop"
        label={data.label || 'Loop'}
        onLabelChange={(label) => updateNodeData(selectedNode.id, { label })}
      >
        <PortLegend
          inputs={getLoopPorts().filter((p) => p.direction === 'in')}
          outputs={getLoopPorts().filter((p) => p.direction === 'out')}
        />
        <p className="inspector-hint">
          Wire a JSON array into <strong>In</strong>. Each item flows through <strong>Item</strong>{' '}
          to the downstream chain. When all iterations finish, the collected results emit on{' '}
          <strong>Done</strong>.
        </p>
        {iterations > 0 && (
          <p className="inspector-hint">
            Progress: {current} / {iterations} iterations
          </p>
        )}
        <label>
          Max iterations (safety cap)
          <input
            type="number"
            min={1}
            max={200}
            value={data.config?.maxIterations ?? '200'}
            onChange={(e) =>
              updateNodeData(selectedNode.id, {
                config: { ...(data.config ?? {}), maxIterations: e.target.value },
              })
            }
          />
          <span className="inspector-hint">
            Loop stops after this many items, even if the array is longer. Max: 200.
          </span>
        </label>
        {data.lastOutput && (
          <pre className="inspector-preview">
            {data.lastOutput.slice(0, 500)}
            {data.lastOutput.length > 500 ? '…' : ''}
          </pre>
        )}
      </BaseInspectorShell>
    )
  }

  return null
}
