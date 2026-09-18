import { describe, it, expect } from 'vitest'
import { getSiteStats } from '../../src/lib/siteStats'
import { QUEST_IDS } from '../../src/lib/tutorialQuests'
import { EXAMPLE_WORKFLOWS } from '../../src/lib/exampleWorkflows'
import { MANIFEST_TOOLS } from '../../src/tools/manifests/index'
import { getToolCount, TOOL_REGISTRY } from '../../src/tools/registry'

describe('siteStats', () => {
  it('derives counts from the live registry', () => {
    const stats = getSiteStats()

    expect({
      totalTools: stats.totalTools,
      manifestPresets: stats.manifestPresets,
      curatedModules: stats.curatedModules,
      browserTools: stats.browserTools,
      cloudTools: stats.cloudTools,
      customTools: stats.customTools,
      paletteBuildingBlocks: stats.paletteBuildingBlocks,
      guidedQuests: stats.guidedQuests,
      exampleWorkflows: stats.exampleWorkflows,
    }).toMatchInlineSnapshot(`
      {
        "browserTools": 235,
        "cloudTools": 4,
        "curatedModules": 54,
        "customTools": 2,
        "exampleWorkflows": 22,
        "guidedQuests": 8,
        "manifestPresets": 187,
        "paletteBuildingBlocks": 243,
        "totalTools": 241,
      }
    `)

    // Invariants — these should always be true regardless of counts
    expect(stats.totalTools).toBe(getToolCount())
    expect(stats.manifestPresets).toBe(MANIFEST_TOOLS.length)
    expect(stats.guidedQuests).toBe(QUEST_IDS.length)
    expect(stats.exampleWorkflows).toBe(EXAMPLE_WORKFLOWS.length)
  })

  it('matches registry grouping invariants', () => {
    const stats = getSiteStats()
    const browser = TOOL_REGISTRY.filter((t) => t.paletteGroup === 'browser').length
    const cloud = TOOL_REGISTRY.filter((t) => t.paletteGroup === 'cloud').length
    const custom = TOOL_REGISTRY.filter((t) => t.paletteGroup === 'custom').length

    expect(stats.browserTools + stats.cloudTools + stats.customTools).toBe(stats.totalTools)
    expect(browser).toBe(stats.browserTools)
    expect(cloud).toBe(stats.cloudTools)
    expect(custom).toBe(stats.customTools)
    expect(stats.curatedModules + stats.manifestPresets).toBe(stats.totalTools)
  })
})
