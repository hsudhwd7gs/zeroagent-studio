import { describe, it, expect, vi } from 'vitest'
import {
  buildWorkflowExportDocument,
  parseWorkflowExport,
  sanitizeWorkflowFilename,
  applyImportedWorkflow,
  downloadWorkflowExport,
  WORKFLOW_EXPORT_FORMAT,
} from '../../src/lib/workflowIo'
import { makeChat, makeAgent, edgeWithHandles } from '../helpers/graphBuilders'

describe('workflowIo', () => {
  const nodes = [makeChat('c'), makeAgent('a')]
  const edges = [edgeWithHandles('e1', 'c', 'a', 'message', 'context')]

  it('builds and parses export documents', () => {
    const doc = buildWorkflowExportDocument('My Flow', nodes, edges)
    expect(doc.format).toBe(WORKFLOW_EXPORT_FORMAT)
    expect(doc.workflow.name).toBe('My Flow')
    expect(doc.workflow.nodes).toHaveLength(2)

    const blankName = buildWorkflowExportDocument('   ', nodes, edges)
    expect(blankName.workflow.name).toBe('Untitled Workflow')

    const raw = JSON.stringify(doc)
    const parsed = parseWorkflowExport(raw)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.document.workflow.name).toBe('My Flow')
    }
  })

  it('parses legacy raw node exports', () => {
    const legacy = JSON.stringify({ name: 'Legacy', nodes, edges })
    const parsed = parseWorkflowExport(legacy)
    expect(parsed.ok).toBe(true)

    const unnamed = JSON.stringify({ nodes, edges })
    const unnamedParsed = parseWorkflowExport(unnamed)
    expect(unnamedParsed.ok).toBe(true)
    if (unnamedParsed.ok) {
      expect(unnamedParsed.document.workflow.name).toBe('Imported Workflow')
    }
  })

  it('fills optional export metadata when missing', () => {
    const parsed = parseWorkflowExport(
      JSON.stringify({
        format: WORKFLOW_EXPORT_FORMAT,
        version: 1,
        workflow: { name: 'Partial', nodes, edges },
      })
    )
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(typeof parsed.document.exportedAt).toBe('number')
      expect(parsed.document.version).toBe(1)
    }

    const noName = parseWorkflowExport(
      JSON.stringify({
        format: WORKFLOW_EXPORT_FORMAT,
        version: 1,
        exportedAt: 123,
        workflow: { nodes, edges },
      })
    )
    expect(noName.ok).toBe(true)
    if (noName.ok) {
      expect(noName.document.workflow.name).toBe('Imported Workflow')
      expect(noName.document.exportedAt).toBe(123)
    }
  })

  it('rejects invalid json and unknown shapes', () => {
    expect(parseWorkflowExport('{not json').ok).toBe(false)
    expect(parseWorkflowExport('{}').ok).toBe(false)
    expect(parseWorkflowExport('null').ok).toBe(false)
    expect(parseWorkflowExport(JSON.stringify({ format: WORKFLOW_EXPORT_FORMAT })).ok).toBe(false)
    expect(
      parseWorkflowExport(
        JSON.stringify({ format: WORKFLOW_EXPORT_FORMAT, version: 1, workflow: { name: 'X' } })
      ).ok
    ).toBe(false)
    expect(
      parseWorkflowExport(
        JSON.stringify({ format: WORKFLOW_EXPORT_FORMAT, version: 1, workflow: null })
      ).ok
    ).toBe(false)
    expect(
      parseWorkflowExport(
        JSON.stringify({
          format: WORKFLOW_EXPORT_FORMAT,
          version: 1,
          workflow: { name: 'X', nodes: [], edges: 'bad' },
        })
      ).ok
    ).toBe(false)
  })

  it('rejects newer export versions', () => {
    const doc = buildWorkflowExportDocument('X', nodes, edges)
    doc.version = 999
    expect(parseWorkflowExport(JSON.stringify(doc)).ok).toBe(false)
  })

  it('sanitizes filenames', () => {
    expect(sanitizeWorkflowFilename('My Cool Flow!')).toBe('My-Cool-Flow')
    expect(sanitizeWorkflowFilename('   ')).toBe('workflow')
  })

  it('applies import with edge migration', () => {
    const doc = buildWorkflowExportDocument('Imported', nodes, [
      { id: 'e1', source: 'c', target: 'a' },
    ])
    const applied = applyImportedWorkflow(doc)
    expect(applied.name).toBe('Imported')
    expect(applied.edges[0].sourceHandle).toBe('message')

    const blankNameDoc = buildWorkflowExportDocument('Imported', nodes, edges)
    blankNameDoc.workflow.name = '   '
    expect(applyImportedWorkflow(blankNameDoc).name).toBe('Imported Workflow')
  })

  it('downloads export as a json file', () => {
    const click = vi.fn()
    const anchor = { href: '', download: '', click } as unknown as HTMLAnchorElement
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    const doc = buildWorkflowExportDocument('Download Me', nodes, edges)
    downloadWorkflowExport(doc)

    expect(anchor.download).toBe('Download-Me.brainwire.json')
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:mock')

    createElement.mockRestore()
    createUrl.mockRestore()
    revoke.mockRestore()
  })

  it('export documents never include settings api keys', () => {
    const doc = buildWorkflowExportDocument('Safe', nodes, edges)
    const raw = JSON.stringify(doc)
    expect(raw).not.toMatch(/apiKeys|openrouter|sk-or/)
    expect(doc.workflow).not.toHaveProperty('apiKeys')
  })

  it('redacts API-key-like strings pasted into tool config on export', () => {
    const toolNode = {
      id: 't1',
      type: 'tool',
      position: { x: 0, y: 0 },
      data: {
        toolType: 'custom-script',
        label: 'Script',
        config: {
          script: 'const key = "sk-or-v1-abcdefghijklmnopqrstuvwxyz"',
          sample: 'hello',
        },
      },
    }
    const doc = buildWorkflowExportDocument('Secrets', [toolNode], [])
    const exported = doc.workflow.nodes[0].data as { config: Record<string, string> }
    expect(exported.config.script).toMatch(/REDACTED/)
    expect(exported.config.sample).toBe('hello')
  })

  it('leaves nodes unchanged when no secrets are present', () => {
    const nodes = [
      {
        id: 'n1',
        type: 'tool',
        position: { x: 0, y: 0 },
        data: { label: 'Ok', config: { sample: 'hello' }, tags: ['a', 'b'] },
      },
      { id: 'n2', type: 'tool', position: { x: 0, y: 0 }, data: null },
    ] as unknown as import('@xyflow/react').Node[]
    const doc = buildWorkflowExportDocument('Clean', nodes, [])
    expect(doc.workflow.nodes[0].data).toEqual(nodes[0].data)
    expect(doc.workflow.nodes[1]).toEqual(nodes[1])
  })

  it('redacts secrets in agent prompts and chat messages on export', () => {
    const agentNode = {
      id: 'a1',
      type: 'agent',
      position: { x: 0, y: 0 },
      data: {
        label: 'Agent',
        role: 'helper',
        systemPrompt: 'Use key sk-or-v1-abcdefghijklmnopqrstuvwxyz for nothing',
        brain: 'openrouter',
      },
    }
    const chatNode = {
      id: 'c1',
      type: 'chat',
      position: { x: 0, y: 0 },
      data: {
        label: 'Chat',
        messages: [
          {
            id: 'm1',
            role: 'user',
            content: 'gsk_abcdefghijklmnopqrstuvwxyz123456',
            timestamp: 1,
          },
        ],
      },
    }
    const doc = buildWorkflowExportDocument('Leaks', [agentNode, chatNode], [])
    const agent = doc.workflow.nodes[0].data as { systemPrompt: string }
    const chat = doc.workflow.nodes[1].data as { messages: { content: string }[] }
    expect(agent.systemPrompt).toMatch(/REDACTED/)
    expect(chat.messages[0].content).toMatch(/REDACTED/)
  })

  it('preserves text-output history in export and import', () => {
    const outputNode = {
      id: 'out',
      type: 'tool',
      position: { x: 0, y: 0 },
      data: {
        label: 'Text Output',
        toolType: 'text-output',
        outputLog: [{ text: 'captured line', timestamp: 1700000000000 }],
      },
    }
    const doc = buildWorkflowExportDocument('Capture', [outputNode], [])
    const exported = doc.workflow.nodes[0].data as { outputLog?: { text: string }[] }
    expect(exported.outputLog).toHaveLength(1)
    expect(exported.outputLog?.[0].text).toBe('captured line')

    const parsed = parseWorkflowExport(JSON.stringify(doc))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      const imported = parsed.document.workflow.nodes[0].data as { outputLog?: { text: string }[] }
      expect(imported.outputLog?.[0].text).toBe('captured line')
    }
  })
})
