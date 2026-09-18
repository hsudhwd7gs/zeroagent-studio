import { NodeResizer } from '@xyflow/react'
import { getNodeResizeLimits } from '../../lib/nodeDimensions'

export function NodeResizeControls({
  nodeType,
  selected,
  locked = false,
}: {
  nodeType: 'agent' | 'tool' | 'chat' | 'loop'
  selected: boolean
  locked?: boolean
}) {
  const limits = getNodeResizeLimits(nodeType)
  return (
    <NodeResizer
      isVisible={selected && !locked}
      minWidth={limits.minWidth}
      minHeight={limits.minHeight}
      maxWidth={limits.maxWidth}
      maxHeight={limits.maxHeight}
      lineClassName="node-resizer-line"
      handleClassName="node-resizer-handle"
    />
  )
}
