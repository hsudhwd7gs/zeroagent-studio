import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY, getToolCount, listTools, getTool, paletteDragTypeToToolId } from '../../src/tools/registry'
import { canConnect } from '../../src/lib/ports'
import { MANIFEST_TOOLS } from '../../src/tools/manifests/index'

describe('tool catalog', () => {
  it('has consistent registry counts', () => {
    expect(getToolCount()).toMatchInlineSnapshot(`314`)
    expect(TOOL_REGISTRY.length).toMatchInlineSnapshot(`314`)
    const ids = new Set(TOOL_REGISTRY.map((t) => t.id))
    expect(ids.size).toMatchInlineSnapshot(`314`)
  })

  it('every tool has inputs and outputs', () => {
    for (const tool of listTools()) {
      expect(tool.inputs.length).toBeGreaterThan(0)
      expect(tool.outputs.length).toBeGreaterThan(0)
      expect(tool.paletteDragType).toMatch(/^tool-/)
    }
  })

  it('manifest count matches manifest file', () => {
    expect(MANIFEST_TOOLS.length).toBe(185)
  })

  it('has NO duplicate tool ids (regression: json-merge/json-flatten were registered twice)', () => {
    // Duplicates made the palette show the same tool twice while the
    // TOOL_MAP silently kept only the last definition — the shadowed tool
    // became unreachable dead code and users could add nodes whose inspector
    // did not match the palette entry they clicked.
    const seen = new Map<string, number>()
    for (const tool of TOOL_REGISTRY) {
      seen.set(tool.id, (seen.get(tool.id) ?? 0) + 1)
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1)
    expect(dupes).toEqual([])
  })

  it('has NO duplicate palette drag types (palette entries must be unique)', () => {
    const seen = new Map<string, number>()
    for (const tool of TOOL_REGISTRY) {
      seen.set(tool.paletteDragType, (seen.get(tool.paletteDragType) ?? 0) + 1)
    }
    const dupes = [...seen.entries()].filter(([, n]) => n > 1)
    expect(dupes).toEqual([])
  })

  it('every palette drag type resolves back to its tool', () => {
    for (const tool of TOOL_REGISTRY) {
      const resolved = paletteDragTypeToToolId(tool.paletteDragType)
      expect(resolved, `dragType ${tool.paletteDragType}`).toBe(tool.id)
    }
  })

  it('every tool has complete manifest fields', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.id, 'id').toBeTruthy()
      expect(tool.label, `label of ${tool.id}`).toBeTruthy()
      expect(tool.description, `description of ${tool.id}`).toBeTruthy()
      expect(tool.icon, `icon of ${tool.id}`).toBeTruthy()
      expect(['browser', 'fusion', 'cloud', 'local', 'engine', 'custom']).toContain(tool.paletteGroup)
      expect(tool.requirement.kind, `requirement of ${tool.id}`).toBeTruthy()
      expect(typeof tool.run, `run of ${tool.id}`).toBe('function')
      // Ports: each direction must exist and be internally consistent.
      for (const port of [...tool.inputs, ...tool.outputs]) {
        expect(port.id, `port id of ${tool.id}`).toBeTruthy()
        expect(port.direction, `port direction of ${tool.id}`).toBeTruthy()
        expect(port.dataType, `port dataType of ${tool.id}`).toBeTruthy()
      }
      expect(tool.inputs.some((p) => p.direction === 'in'), `inputs of ${tool.id}`).toBe(true)
      expect(tool.outputs.some((p) => p.direction === 'out'), `outputs of ${tool.id}`).toBe(true)
      expect(tool.inputs.every((p) => p.direction === 'in'), `input dir of ${tool.id}`).toBe(true)
      expect(tool.outputs.every((p) => p.direction === 'out'), `output dir of ${tool.id}`).toBe(true)
    }
  })

  it('json-merge and json-flatten resolve to the rich curated versions', () => {
    // The curated tools support deep merge (mode config) and flatten options;
    // the accidental manifest duplicates used to shadow them.
    const merge = getTool('json-merge')
    expect(merge.engine).toBeUndefined()
    const flatten = getTool('json-flatten')
    expect(flatten.engine).toBeUndefined()
  })

  it('text tools can connect text to text', () => {
    const trim = getTool('trim-text')
    const inPort = trim.inputs.find((p) => p.direction === 'in')!
    const outPort = trim.outputs.find((p) => p.direction === 'out')!
    expect(canConnect(outPort, inPort)).toBe(true)
  })
})
