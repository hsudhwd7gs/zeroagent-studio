import { useMemo } from 'react'
import type { Edge } from '@xyflow/react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useExecutionStore } from '../../stores/executionStore'
import { getPortDef, resolveEdgeSourceHandle, resolveEdgeTargetHandle } from '../../lib/nodePorts'
import { portTypeColor } from '../../lib/ports'

function nodeLabel(nodeId: string, nodes: ReturnType<typeof useWorkflowStore.getState>['nodes']): string {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return nodeId
  const data = node.data as { label?: string }
  return data.label || nodeId
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function EdgeInspector({ edge, collapsed = false, onToggleCollapse, mobileOpen = false, onCloseMobile }: { edge: Edge, collapsed?: boolean, onToggleCollapse?: () => void, mobileOpen?: boolean, onCloseMobile?: () => void }) {
  const nodes = useWorkflowStore((s) => s.nodes)
  const transfer = useExecutionStore((s) => s.edgeTransfers[edge.id])
  const isFlowing = useExecutionStore((s) => s.flowingEdges.has(edge.id))
  const isRunning = useExecutionStore((s) => s.isRunning)

  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  const sourceHandle = resolveEdgeSourceHandle(edge, nodes)
  const targetHandle = resolveEdgeTargetHandle(edge, nodes)

  const sourcePort = sourceNode ? getPortDef(sourceNode, sourceHandle, 'source') : null
  const targetPort = targetNode ? getPortDef(targetNode, targetHandle, 'target') : null

  const preview = useMemo(() => {
    if (!transfer?.value) return null
    const max = 4000
    if (transfer.value.length <= max) return transfer.value
    return `${transfer.value.slice(0, max)}\n\n… (${transfer.value.length - max} more characters)`
  }, [transfer])

  return (
    <aside
      className={`sidebar inspector edge-inspector ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}
      onClick={collapsed ? (e) => {
        if ((e.target as HTMLElement).closest('.sidebar-collapse-btn')) return
        onToggleCollapse?.()
      } : undefined}
    >
      <div className="sidebar-header-row">
        <h3 className="sidebar-title">Connector</h3>
        {onToggleCollapse && (
          <button
            type="button"
            className={`sidebar-collapse-btn ${collapsed ? 'is-collapsed' : ''}`}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand inspector panel' : 'Collapse inspector panel'}
            title={collapsed ? 'Expand panel (] to toggle)' : 'Collapse panel (] to toggle)'}
          >
            <span className="chevron" aria-hidden>›</span>
          </button>
        )}
        {mobileOpen && onCloseMobile && (
          <button
            type="button"
            className="sidebar-collapse-btn mobile-close-btn"
            onClick={onCloseMobile}
            aria-label="Close panel"
            title="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="edge-inspector-status">
        <span className={`edge-inspector-badge ${selectedBadgeClass(isFlowing, isRunning)}`}>
          {statusLabel(isFlowing, isRunning, !!transfer)}
        </span>
      </div>

      <div className="edge-inspector-route">
        <div className="edge-inspector-endpoint">
          <span className="edge-inspector-endpoint-label">From</span>
          <strong>{nodeLabel(edge.source, nodes)}</strong>
          {sourcePort && (
            <span className="edge-inspector-port" style={{ color: portTypeColor(sourcePort.dataType) }}>
              {sourcePort.label} · {sourcePort.dataType}
            </span>
          )}
        </div>
        <div className="edge-inspector-arrow" aria-hidden>
          →
        </div>
        <div className="edge-inspector-endpoint">
          <span className="edge-inspector-endpoint-label">To</span>
          <strong>{nodeLabel(edge.target, nodes)}</strong>
          {targetPort && (
            <span className="edge-inspector-port" style={{ color: portTypeColor(targetPort.dataType) }}>
              {targetPort.label} · {targetPort.dataType}
            </span>
          )}
        </div>
      </div>

      <p className="inspector-hint">
        Press <kbd>Backspace</kbd> or <kbd>Delete</kbd> to remove this wire. Run the workflow to see live
        data flow with matrix pulses.
      </p>

      <div className="edge-inspector-payload">
        <div className="edge-inspector-payload-header">
          <span>Last payload</span>
          {transfer && (
            <span className="edge-inspector-payload-meta">
              {transfer.dataType} · {formatTimestamp(transfer.timestamp)}
            </span>
          )}
        </div>
        {preview ? (
          <pre className="edge-inspector-payload-body">{preview}</pre>
        ) : (
          <p className="inspector-empty edge-inspector-empty">
            No data yet. Connect blocks and run the workflow — the exact text or number that crossed this
            wire will appear here.
          </p>
        )}
      </div>
    </aside>
  )
}

function statusLabel(isFlowing: boolean, isRunning: boolean, hasTransfer: boolean): string {
  if (isFlowing) return '● Flowing now'
  if (isRunning) return '○ Run in progress'
  if (hasTransfer) return '✓ Last run captured'
  return '— Idle'
}

function selectedBadgeClass(isFlowing: boolean, isRunning: boolean): string {
  if (isFlowing) return 'edge-inspector-badge--flowing'
  if (isRunning) return 'edge-inspector-badge--running'
  return 'edge-inspector-badge--idle'
}
