import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import type { ChatNodeData } from '../../types'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useExecutionStore } from '../../stores/executionStore'
import { runWorkflow } from '../../orchestrator/dag'
import { CHAT_INPUT_PLACEHOLDER } from '../../lib/brainChoiceGuidance'
import { getChatPorts } from '../../lib/nodePorts'
import { buildChatPrivacyWarning } from '../../lib/workflowPrivacy'
import { PortHandles } from './PortHandles'
import { readNodeLocked } from '../../lib/nodeCanvasLock'
import { NodeActionBar } from './NodeActionBar'
import { NodeResizeControls } from './NodeResizeControls'
import { RichMediaRenderer } from './RichMediaRenderer'
import './nodes.css'

function ChatNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ChatNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const nodes = useWorkflowStore((s) => s.nodes)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const messagesRef = useRef<HTMLDivElement>(null)
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const privacyWarning = useMemo(() => buildChatPrivacyWarning(nodes, apiKeys), [nodes, apiKeys])
  const canvasLocked = readNodeLocked(nodeData)

  const messageCount = nodeData.messages?.length ?? 0

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messageCount, isRunning])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { inputValue: e.target.value } as Partial<ChatNodeData>)
    },
    [id, updateNodeData]
  )

  const handleSend = useCallback(async () => {
    const input = nodeData.inputValue?.trim()
    if (!input || isRunning) return

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: input,
      timestamp: Date.now(),
    }

    updateNodeData(id, {
      messages: [...(nodeData.messages ?? []), userMessage],
      inputValue: '',
    } as Partial<ChatNodeData>)

    const { nodes: liveNodes, edges: liveEdges } = useWorkflowStore.getState()
    const apiKeysLive = useSettingsStore.getState().apiKeys

    try {
      await runWorkflow(liveNodes, liveEdges, input, apiKeysLive)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      const help =
        errorMsg.includes('key') || errorMsg.includes('Brain') || errorMsg.includes('OpenRouter')
          ? '\n\nTip: For faster replies, add a free OpenRouter key in Privacy & keys (openrouter.ai/keys) — auto-rotates between $0 models. No key? Transformers.js runs locally at $0; the first reply may download a model.'
          : ''
      const freshNode = useWorkflowStore.getState().nodes.find((n) => n.id === id)
      const currentMessages = (freshNode?.data as ChatNodeData | undefined)?.messages ?? []

      updateNodeData(id, {
        messages: [
          ...currentMessages,
          {
            id: `msg-${Date.now()}-err`,
            role: 'assistant' as const,
            content: `${errorMsg}${help}`,
            timestamp: Date.now(),
          },
        ],
      } as Partial<ChatNodeData>)
    }
  }, [id, nodeData, isRunning, updateNodeData])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <motion.div
      className={`custom-node chat-node ${selected ? 'selected' : ''} ${canvasLocked ? 'node-canvas-locked' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <NodeResizeControls nodeType="chat" selected={selected} locked={canvasLocked} />
      <NodeActionBar nodeId={id} selected={selected} locked={canvasLocked} />
      <div className="custom-node__inner">
      <div className="node-header">
        <span className="node-icon">💬</span>
        <span className="node-type">{nodeData.label || 'Chat'}</span>
      </div>
      <div className="node-body chat-body">
        <div ref={messagesRef} className="chat-messages nowheel nodrag">
          {(nodeData.messages ?? []).map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <span className="message-role">{msg.role}</span>
              <div className="message-content">
                <RichMediaRenderer text={msg.content} />
              </div>
            </div>
          ))}
        </div>
        <div className="chat-input-area nowheel nodrag">
          {privacyWarning && (
            <p className="chat-privacy-warning" role="note">
              {privacyWarning}
            </p>
          )}
          <div className="chat-input-row">
            <textarea
              className="chat-input nowheel nodrag"
              data-tutorial-target="chat-input"
              placeholder={CHAT_INPUT_PLACEHOLDER}
              value={nodeData.inputValue ?? ''}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isRunning}
            />
            <button
              className="chat-send-btn"
              data-tutorial-target="chat-send"
              onClick={handleSend}
              disabled={isRunning || !nodeData.inputValue?.trim()}
            >
              {isRunning ? '...' : '▶'}
            </button>
          </div>
        </div>
      </div>
      </div>
      <PortHandles nodeId={id} ports={getChatPorts()} connectable={!canvasLocked} />
    </motion.div>
  )
}

export default memo(ChatNodeComponent)
