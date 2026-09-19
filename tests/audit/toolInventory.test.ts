/**
 * Audit script: dumps the complete tool inventory from the real registry.
 * Run: npx vitest run tests/audit/toolInventory.audit.ts
 * Writes /tmp/tool-inventory.json for analysis.
 */
import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { TOOL_REGISTRY } from '../../src/tools/registry'

describe('tool inventory audit', () => {
  it('dumps full inventory', () => {
    const tools = TOOL_REGISTRY.map((t) => ({
      id: t.id,
      label: t.label,
      group: t.paletteGroup,
      sub: t.browserSubcategory ?? '',
      requirement:
        t.requirement.kind === 'apiKey'
          ? `key:${t.requirement.provider}`
          : t.requirement.kind === 'browser'
            ? `browser:${t.requirement.feature}`
            : 'none',
      engine: t.engine ?? '',
      inputs: t.inputs.map((p) => p.id).join(','),
      outputs: t.outputs.map((p) => p.id).join(','),
      desc: t.description,
    }))
    writeFileSync(
      '/tmp/tool-inventory.json',
      JSON.stringify(
        {
          total: tools.length,
          byGroup: tools.reduce<Record<string, number>>((acc, t) => {
            acc[t.group] = (acc[t.group] ?? 0) + 1
            return acc
          }, {}),
          tools,
        },
        null,
        2
      )
    )
    console.log(`TOTAL TOOLS: ${tools.length}`)
  })
})
