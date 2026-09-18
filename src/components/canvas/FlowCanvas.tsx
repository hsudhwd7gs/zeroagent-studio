import { useCallback, useRef, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
  type OnConnectStart,
  type OnConnectEnd,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AgentNode from '../nodes/AgentNode'
import ToolNode from '../nodes/ToolNode'
import ChatNode from '../nodes/ChatNode'
import LoopNode from '../nodes/LoopNode'
import AnimatedEdge from '../edges/AnimatedEdge'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useConnectionStore } from '../../stores/connectionStore'
import { createNodeFromPaletteType } from '../../lib/addPaletteNode'
import { setFlowCanvasInstance } from '../../lib/flowCanvasRegistry'
import { isValidWorkflowConnection } from '../../lib/connectionValidation'
import CanvasHintBar from './CanvasHintBar'
import CanvasEmptyState from './CanvasEmptyState'

const nodeTypes = {
  agent: AgentNode,
  tool: ToolNode,
  chat: ChatNode,
  loop: LoopNode,
}

const edgeTypes = {
  animated: AnimatedEdge,
}

export default function FlowCanvas({ suppressEmptyState = false }: { suppressEmptyState?: boolean }) {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange)
  const onConnect = useWorkflowStore((s) => s.onConnect)
  const setNodes = useWorkflowStore((s) => s.setNodes)
  const setConnectingFrom = useConnectionStore((s) => s.setConnectingFrom)
  const reactFlowRef = useRef<ReactFlowInstance | null>(null)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData('application/reactflow')
      if (!type || !reactFlowRef.current) return

      const position = reactFlowRef.current.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      })

      const newNode = createNodeFromPaletteType(type, position)
      if (!newNode) return

      const liveNodes = useWorkflowStore.getState().nodes
      setNodes([...liveNodes, newNode])
    },
    [setNodes]
  )

  const isValidConnection = useCallback(
    (connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }) =>
      isValidWorkflowConnection(connection, nodes, edges),
    [nodes, edges]
  )

  const onConnectStart: OnConnectStart = useCallback(
    (_event, { nodeId, handleId, handleType }) => {
      if (nodeId && handleId && handleType) {
        setConnectingFrom({
          nodeId,
          handleId,
          handleType: handleType as 'source' | 'target',
        })
      }
    },
    [setConnectingFrom]
  )

  const onConnectEnd: OnConnectEnd = useCallback(() => {
    setConnectingFrom(null)
  }, [setConnectingFrom])

  const styledEdges = useMemo(
    () => edges.map((e) => ({ ...e, type: e.type ?? 'animated' })),
    [edges]
  )

  return (
    <div className="flow-canvas" data-tutorial-target="canvas">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onInit={(instance) => {
          reactFlowRef.current = instance as ReactFlowInstance
          setFlowCanvasInstance(instance as ReactFlowInstance)
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        deleteKeyCode={['Backspace', 'Delete']}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: 'animated', selectable: true }}
        edgesFocusable
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.05)" />
        <Controls className="flow-controls" position="bottom-left" />
        <MiniMap
          className="flow-minimap"
          nodeColor={(n) => {
            if (n.type === 'agent') return '#8b5cf6'
            if (n.type === 'tool') return '#10b981'
            if (n.type === 'loop') return '#f59e0b'
            return '#06b6d4'
          }}
          maskColor="rgba(10, 10, 11, 0.8)"
        />
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="edge-matrix-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </ReactFlow>
      <CanvasEmptyState hidden={suppressEmptyState} />
      <CanvasHintBar hidden={suppressEmptyState} />
    </div>
  )
}
