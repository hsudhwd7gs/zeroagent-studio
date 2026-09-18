import { describe, it, expect } from 'vitest'
import { TOOL_REGISTRY, getToolCount, listTools, getTool } from '../../src/tools/registry'
import { canConnect } from '../../src/lib/ports'
import { MANIFEST_TOOLS } from '../../src/tools/manifests/index'

describe('tool catalog', () => {
  it('has consistent registry counts', () => {
    expect(getToolCount()).toMatchInlineSnapshot(`242`)
    expect(TOOL_REGISTRY.length).toMatchInlineSnapshot(`242`)
    const ids = new Set(TOOL_REGISTRY.map((t) => t.id))
    expect(ids.size).toMatchInlineSnapshot(`240`)
  })

  it('every tool has inputs and outputs', () => {
    for (const tool of listTools()) {
      expect(tool.inputs.length).toBeGreaterThan(0)
      expect(tool.outputs.length).toBeGreaterThan(0)
      expect(tool.paletteDragType).toMatch(/^tool-/)
    }
  })

  it('manifest count matches manifest file', () => {
    expect(MANIFEST_TOOLS.length).toBe(187)
  })

  it('text tools can connect text to text', () => {
    const trim = getTool('trim-text')
    const inPort = trim.inputs.find((p) => p.direction === 'in')!
    const outPort = trim.outputs.find((p) => p.direction === 'out')!
    expect(canConnect(outPort, inPort)).toBe(true)
  })
})
