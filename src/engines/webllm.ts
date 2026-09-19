import type { BrainEngine, ChatMessage, EngineOptions, EngineResult } from './types'
import { createModelLoadCallback } from '../stores/modelLoadStore'

let engineInstance: Awaited<ReturnType<typeof import('@mlc-ai/web-llm').CreateMLCEngine>> | null = null
let loadingPromise: Promise<void> | null = null
let currentModel = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'

export const AVAILABLE_LOCAL_MODELS = [
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
]

export async function initWebLLM(
  model: string = currentModel,
  onProgress?: (progress: { text: string; progress: number }) => void
): Promise<void> {
  if (engineInstance && currentModel === model) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm')
    if (engineInstance) {
      await engineInstance.unload()
      engineInstance = null
    }
    currentModel = model
    try {
      engineInstance = await CreateMLCEngine(model, {
        initProgressCallback: (report) => {
          onProgress?.({
            text: report.text,
            progress: report.progress,
          })
        },
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Could not load the WebLLM model "${model}" (${detail}). ` +
          'The model downloads on first use — check your connection and press Run again to retry, ' +
          'or switch this Agent to another brain in Block settings.',
        { cause: err },
      )
    }
  })()

  try {
    await loadingPromise
  } finally {
    // Always clear the promise — including on failure — so a later run can retry.
    loadingPromise = null
  }
}

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

export const webLLMEngine: BrainEngine = {
  name: 'WebLLM (Local)',

  isAvailable: () => isWebGPUAvailable(),

  async chat(messages: ChatMessage[], options?: EngineOptions): Promise<EngineResult> {
    const model = options?.model ?? currentModel
    if (!engineInstance || currentModel !== model) {
      await initWebLLM(model, createModelLoadCallback('WebLLM'))
    }
    if (!engineInstance) throw new Error('Failed to initialize WebLLM engine')

    const reply = await engineInstance.chat.completions.create({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 512,
    })

    const content = reply.choices[0]?.message?.content ?? ''
    return {
      content,
      model: currentModel,
      usage: reply.usage
        ? {
            promptTokens: reply.usage.prompt_tokens ?? 0,
            completionTokens: reply.usage.completion_tokens ?? 0,
          }
        : undefined,
    }
  },
}

export async function unloadWebLLM(): Promise<void> {
  if (engineInstance) {
    await engineInstance.unload()
    engineInstance = null
  }
}
