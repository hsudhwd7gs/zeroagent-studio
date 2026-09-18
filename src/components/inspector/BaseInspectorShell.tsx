import type { ReactNode } from 'react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { isNodeCanvasLocked, NODE_CANVAS_LOCK_HINT } from '../../lib/nodeCanvasLock'

interface BaseInspectorShellProps {
  title: string
  nodeId: string
  nodeType: 'chat' | 'agent' | 'tool' | 'loop'
  label: string
  onLabelChange: (label: string) => void
  children?: ReactNode
}

const TYPE_BADGES: Record<BaseInspectorShellProps['nodeType'], string> = {
  chat: 'Chat',
  agent: 'Agent',
  tool: 'Tool',
  loop: 'Loop',
}

export function BaseInspectorShell({
  title,
  nodeId,
  nodeType,
  label,
  onLabelChange,
  children,
}: BaseInspectorShellProps) {
  const deleteNode = useWorkflowStore((s) => s.deleteNode)
  const canvasLocked = useWorkflowStore((s) => isNodeCanvasLocked(s.nodes.find((n) => n.id === nodeId)))

  return (
    <aside className="sidebar inspector">
      <div className="inspector-header-row">
        <h3 className="sidebar-title">{title}</h3>
        <span className={`inspector-type-badge inspector-type-badge--${nodeType}`}>
          {TYPE_BADGES[nodeType]}
        </span>
      </div>
      <div className="inspector-fields">
        <label>
          Display name
          <input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={TYPE_BADGES[nodeType]}
          />
        </label>
        <button
          type="button"
          className="inspector-delete-btn"
          disabled={canvasLocked}
          title={canvasLocked ? NODE_CANVAS_LOCK_HINT : undefined}
          onClick={() => deleteNode(nodeId)}
        >
          Delete block
        </button>
        {children}
      </div>
    </aside>
  )
}
