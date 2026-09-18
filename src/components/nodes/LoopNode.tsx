import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import type { LoopNodeData } from '../../types'
import { useExecutionStore } from '../../stores/executionStore'
import { getLoopPorts } from '../../lib/nodePorts'
import { PortHandles } from './PortHandles'
import { readNodeLocked } from '../../lib/nodeCanvasLock'
import { NodeActionBar } from './NodeActionBar'
import { NodeResizeControls } from './NodeResizeControls'
import './nodes.css'

function LoopNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as LoopNodeData
  const isThinking = useExecutionStore((s) => s.thinkingNodes.has(id))
  const canvasLocked = readNodeLocked(nodeData)

  const iteration = nodeData.currentIteration ?? 0
  const total = nodeData.totalIterations ?? 0
  const progress = total > 0 ? Math.round((iteration / total) * 100) : 0

  return (
    <motion.div
      className={`custom-node loop-node ${selected ? 'selected' : ''} ${isThinking ? 'thinking' : ''} ${canvasLocked ? 'node-canvas-locked' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <NodeResizeControls nodeType="loop" selected={selected} locked={canvasLocked} />
      <NodeActionBar nodeId={id} selected={selected} locked={canvasLocked} />
      <PortHandles nodeId={id} ports={getLoopPorts()} connectable={!canvasLocked} />
      <div className="custom-node__inner">
        <div className="node-header">
          <span className="node-icon">🔁</span>
          <span className="node-type">Loop</span>
          {isThinking && <span className="thinking-indicator" />}
        </div>
        <div className="node-body">
          <div className="node-label">{nodeData.label || 'Loop'}</div>
          <div className="node-meta">
            <span className="tool-type-badge">
              {total > 0 ? `${iteration} / ${total}` : 'idle'}
            </span>
          </div>
          {total > 0 && (
            <div className="loop-progress" style={{ marginTop: 8 }}>
              <div
                style={{
                  height: 4,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--accent-cyan)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div className="inspector-hint" style={{ marginTop: 4 }}>
                {progress}% complete
              </div>
            </div>
          )}
          {nodeData.lastOutput && (
            <div className="node-output-preview">
              {nodeData.lastOutput.slice(0, 200)}
              {nodeData.lastOutput.length > 200 ? '…' : ''}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default memo(LoopNodeComponent)
