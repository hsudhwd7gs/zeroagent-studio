import type { ApiKeys } from '../types'
import type { PortDef, PortValue } from '../lib/ports'
import { getPrimaryInput, singleTextOutput, TEXT_IN, TEXT_OUT } from '../lib/ports'

export type ToolPaletteGroup = 'browser' | 'cloud' | 'custom'

export type ToolRequirement =
  | { kind: 'none' }
  | { kind: 'apiKey'; provider: keyof ApiKeys }
  | { kind: 'browser'; feature: 'speechRecognition' | 'speechSynthesis' | 'clipboard' }

export interface ToolContext {
  apiKeys: ApiKeys
  log: (level: 'info' | 'warn' | 'error', message: string) => void
}

export type ToolType = string

export type BrowserSubcategory =
  | 'output'
  | 'text'
  | 'encoding'
  | 'json'
  | 'list'
  | 'math'
  | 'date'
  | 'validate'
  | 'flow'
  | 'regex'
  | 'generate'
  | 'html'
  | 'markdown'
  | 'csv'
  | 'compare'
  | 'curated'
  | 'media'
  | 'ai'

export interface ToolAutoRunConfig {
  defaultEnabled: boolean
  canRunWithoutInput: (config: Record<string, string>) => boolean
}

export interface ToolDefinition {
  id: ToolType
  label: string
  description: string
  icon: string
  paletteGroup: ToolPaletteGroup
  browserSubcategory?: BrowserSubcategory
  paletteDragType: string
  requirement: ToolRequirement
  inputs: PortDef[]
  outputs: PortDef[]
  engine?: string
  autoRun?: ToolAutoRunConfig
  run: (
    inputs: Record<string, PortValue>,
    config: Record<string, string>,
    ctx: ToolContext
  ) => Promise<Record<string, PortValue>>
}

export function wrapLegacyRun(
  fn: (input: string, config: Record<string, string>, ctx: ToolContext) => Promise<string> | string
): ToolDefinition['run'] {
  return async (portInputs, config, ctx) => {
    const result = await fn(getPrimaryInput(portInputs), config, ctx)
    return singleTextOutput(result)
  }
}

export const DEFAULT_TOOL_IO: { inputs: PortDef[]; outputs: PortDef[] } = {
  inputs: [TEXT_IN],
  outputs: [TEXT_OUT],
}
