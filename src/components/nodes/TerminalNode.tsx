import { useEffect, useRef, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { TerminalNodeData } from '../../types'
import { useWorkflowStore } from '../../stores/workflowStore'
import { runTerminal, truncateTerminalOutput } from '../../tools/terminal'

// Per-node virtual filesystem — persists for the lifetime of the page.
// One VFS per node id.
const nodeVfsMap = new Map<string, Map<string, string>>()

function getVfsForNode(nodeId: string): Map<string, string> {
  let m = nodeVfsMap.get(nodeId)
  if (!m) {
    m = new Map()
    nodeVfsMap.set(nodeId, m)
  }
  return m
}

export default function TerminalNode({ id, data, selected }: NodeProps<Node>) {
  const nodeData = data as unknown as TerminalNodeData
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const [input, setInput] = useState(nodeData.inputValue ?? '')
  const [history, setHistory] = useState<string[]>(nodeData.history ?? [])
  const [running, setRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  const run = async () => {
    const cmd = input.trim()
    if (!cmd || running) return
    setRunning(true)
    setInput('')
    const vfs = getVfsForNode(id)
    try {
      const result = await runTerminal(cmd, { mode: 'pyodide-shell' }, vfs)
      const truncated = truncateTerminalOutput(result)
      const prompt = `brainwire:~$ ${cmd}`
      const output =
        (truncated.stdout || '') +
        (truncated.stderr ? (truncated.stdout ? '\n' : '') + truncated.stderr : '') +
        (truncated.exitCode !== 0 ? `\n[exit ${truncated.exitCode}]` : '') +
        (truncated.truncated ? '\n[output truncated]' : '')
      const newHistory = [...history, prompt, output]
      setHistory(newHistory)
      updateNodeData(id, {
        inputValue: '',
        history: newHistory.slice(-100), // keep last 100 lines
        lastOutput: output,
      } as never)
    } finally {
      setRunning(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    updateNodeData(id, { history: [], lastOutput: '' } as never)
  }

  return (
    <div className={`custom-node terminal-node ${selected ? 'selected' : ''}`}>
      <NodeResizer minWidth={320} minHeight={200} isVisible={!!selected} />
      <div className="custom-node__inner">
        <div className="node-header">
          <span className="node-icon" aria-hidden>🖥️</span>
          <span className="node-type-label">TERMINAL</span>
          <span className="node-label">{nodeData.label || 'Terminal'}</span>
        </div>
        <div className="terminal-output" ref={scrollRef}>
          {history.length === 0 ? (
            <div className="terminal-empty">Type a command and press Enter. Try: help, ls, echo hello</div>
          ) : (
            history.map((line, i) => (
              <pre key={i} className={line.startsWith('brainwire:~$') ? 'terminal-input-line' : 'terminal-output-line'}>
                {line}
              </pre>
            ))
          )}
          {running && <div className="terminal-running">running…</div>}
        </div>
        <div className="terminal-input-row">
          <span className="terminal-prompt" aria-hidden>$</span>
          <input
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void run()
              } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                clearHistory()
              }
            }}
            placeholder="type a command…"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="stdin"
        className="node-handle port-handle port-handle--text"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="stdout"
        className="node-handle port-handle port-handle--text"
      />
    </div>
  )
}
