import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import type { ToolNodeData } from '../../types'
import { useExecutionStore } from '../../stores/executionStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getToolIcon, getToolLabel, getTool, isToolAvailableForConfig } from '../../tools/registry'
import { getToolPorts } from '../../lib/nodePorts'
import { PortHandles } from './PortHandles'
import { readNodeLocked } from '../../lib/nodeCanvasLock'
import { NodeActionBar } from './NodeActionBar'
import { NodeResizeControls } from './NodeResizeControls'
import { RichMediaRenderer } from './RichMediaRenderer'
import './nodes.css'

const SPEECH_MODE_LABELS: Record<string, string> = {
  stt: 'Listen',
  tts: 'Speak',
  both: 'Both',
}

function ToolNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as ToolNodeData
  const isThinking = useExecutionStore((s) => s.thinkingNodes.has(id))
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const hasError = nodeData.lastOutput?.startsWith('Error:')
  const toolLabel = getToolLabel(nodeData.toolType)
  const tool = getTool(nodeData.toolType)
  const setupLocked = !isToolAvailableForConfig(tool, apiKeys, nodeData.config)
  const canvasLocked = readNodeLocked(nodeData)
  const ports = getToolPorts(nodeData.toolType)

  const outputEntryCount =
    nodeData.toolType === 'text-output' ? (nodeData.outputLog?.length ?? 0) : 0
  const latestCapture = nodeData.outputLog?.[0]?.text

  return (
    <motion.div
      className={`custom-node tool-node ${selected ? 'selected' : ''} ${isThinking ? 'thinking' : ''} ${setupLocked ? 'node-setup-locked' : ''} ${canvasLocked ? 'node-canvas-locked' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <NodeResizeControls nodeType="tool" selected={selected} locked={canvasLocked} />
      <NodeActionBar nodeId={id} selected={selected} locked={canvasLocked} />
      <PortHandles nodeId={id} ports={ports} connectable={!canvasLocked} />
      <div className="custom-node__inner">
        <div className="node-header">
          <span className="node-icon">{getToolIcon(nodeData.toolType)}</span>
          <span className="node-type">Tool</span>
          {isThinking && <span className="thinking-indicator" />}
        </div>
        <div className="node-body">
          <div className="node-label">{nodeData.label || toolLabel}</div>
          <div className="node-meta">
            <span className={`tool-type-badge ${setupLocked ? 'tool-type-badge--locked' : ''}`}>
              {setupLocked ? '🔒 locked' : toolLabel}
            </span>
            {nodeData.config?.mode && (
              <span className="role-badge">{SPEECH_MODE_LABELS[nodeData.config.mode] ?? nodeData.config.mode}</span>
            )}
          </div>
          {outputEntryCount > 0 ? (
            <div className="node-output-preview node-output-preview--log">
              <div>
                {outputEntryCount} {outputEntryCount === 1 ? 'entry' : 'entries'} captured
              </div>
              {latestCapture && (
                <div className="node-output-preview-snippet">
                  <RichMediaRenderer text={latestCapture} />
                </div>
              )}
              {hasError && nodeData.lastOutput && (
                <div className="node-output-preview-snippet node-output-error">
                  <RichMediaRenderer text={nodeData.lastOutput} />
                </div>
              )}
            </div>
          ) : (
            nodeData.lastOutput && (
              <div className={`node-output-preview ${hasError ? 'node-output-error' : ''}`}>
                <RichMediaRenderer text={nodeData.lastOutput} />
              </div>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(ToolNodeComponent)
