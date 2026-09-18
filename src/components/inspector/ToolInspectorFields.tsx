import { useState } from 'react'
import type { ToolNodeData } from '../../types'
import { useConfirmStore } from '../../stores/confirmStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkflowStore } from '../../stores/workflowStore'
import { useExecutionStore } from '../../stores/executionStore'
import { canRunCaptureSink } from '../../orchestrator/executionScope'
import {
  getWorkflowStarterKind,
  workflowStarterLabel,
} from '../../lib/workflowStarters'
import {
  runWorkflowStarter,
  formatWorkflowRunResult,
  formatWorkflowRunError,
} from '../../lib/workflowRun'
import {
  listTools,
  getTool,
  isToolRequirementMet,
  isToolAvailableForConfig,
  getToolAvailabilityMessage,
  resolveToolAutoRun,
} from '../../tools/registry'
import { normalizeHttpUrl } from '../../lib/validateUrl'
import { scrapeWebPage, previewScrapeText } from '../../tools/webScraper'
import {
  isSpeechRecognitionAvailable,
  isSpeechSynthesisAvailable,
  previewListen,
  previewSpeak,
  stopSpeaking,
} from '../../tools/speech'
import { runTextTransform } from '../../tools/textTransform'
import { runJsonTool } from '../../tools/jsonTool'
import { runDatetimeTool } from '../../tools/datetimeTool'
import { runCalculator } from '../../tools/calculator'
import { runCustomScript, CUSTOM_SCRIPT_MAX_BYTES } from '../../tools/customScript'
import { BaseInspectorShell } from './BaseInspectorShell'
import { PortLegend } from './PortLegend'
import { runToolForPreview } from '../../tools/registryHelpers'
import { getManifestConfigFields } from '../../lib/manifestConfigFields'
import { getToolSafetyNotice } from '../../lib/toolSafety'
import { ToolSafetyNotice } from './ToolSafetyNotice'
import { InspectorSetupNotice } from './InspectorSetupNotice'
import { formatOutputLogForCopy, parseOutputLogMaxEntries, trimOutputLog } from '../../tools/textOutput'

export function ToolInspectorFields({
  nodeId,
  data,
  updateNodeData,
}: {
  nodeId: string
  data: ToolNodeData
  updateNodeData: (id: string, data: Partial<ToolNodeData>) => void
}) {
  const apiKeys = useSettingsStore((s) => s.apiKeys)
  const openSettings = useSettingsStore((s) => s.openSettings)
  const confirm = useConfirmStore((s) => s.confirm)
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const isRunning = useExecutionStore((s) => s.isRunning)
  const tool = getTool(data.toolType)
  const safetyNotice = getToolSafetyNotice(data.toolType, tool.paletteGroup)
  const requirementMet = isToolAvailableForConfig(tool, apiKeys, data.config)
  const setupMessage = requirementMet ? null : getToolAvailabilityMessage(tool, apiKeys, data.config)
  const needsKeysButton = tool.requirement.kind === 'apiKey'
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [speechListening, setSpeechListening] = useState(false)
  const [speechSpeaking, setSpeechSpeaking] = useState(false)
  const [runStatus, setRunStatus] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)
  const captureReady =
    data.toolType === 'text-output' ? canRunCaptureSink(nodeId, nodes, edges) : false
  const hasAnyUpstream =
    data.toolType === 'text-output'
      ? edges.some((e) => e.target === nodeId)
      : false
  const currentNode = nodes.find((n) => n.id === nodeId)
  const starterKind = currentNode
    ? getWorkflowStarterKind(currentNode, nodes, edges, apiKeys)
    : null

  const setConfig = (patch: Record<string, string>) => {
    updateNodeData(nodeId, { config: { ...data.config, ...patch } })
  }

  const handleToolTypeChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as ToolNodeData['toolType']
    if (newType === data.toolType) return

    const hasConfig = Object.values(data.config ?? {}).some((v) => String(v ?? '').trim())
    const hasOutputHistory =
      data.toolType === 'text-output' && (data.outputLog?.length ?? 0) > 0
    if (hasConfig || hasOutputHistory) {
      const ok = await confirm({
        title: 'Change tool type?',
        message:
          hasConfig && hasOutputHistory
            ? 'Switching tools clears this block’s settings, capture history, and preview.'
            : hasOutputHistory
              ? 'Switching tools clears capture history and preview.'
              : 'Switching tools clears this block’s settings and preview.',
        confirmLabel: 'Change tool',
        variant: 'default',
      })
      if (!ok) {
        e.target.value = data.toolType
        return
      }
    }

    setPreview(null)
    setRunStatus(null)
    updateNodeData(nodeId, {
      toolType: newType,
      config: {},
      outputLog: newType === 'text-output' ? [] : undefined,
    })
  }

  const runPreview = async (fn: () => Promise<string> | string) => {
    setLoading(true)
    setPreview(null)
    try {
      const result = await fn()
      setPreview(result)
    } catch (err) {
      setPreview(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleListen = async () => {
    if (!isSpeechRecognitionAvailable()) return
    setSpeechListening(true)
    setPreview(null)
    try {
      const transcript = await previewListen(data.config?.language ?? 'en-US')
      setPreview(transcript)
    } catch (err) {
      setPreview(err instanceof Error ? err.message : String(err))
    } finally {
      setSpeechListening(false)
    }
  }

  const handlePlay = async () => {
    const text = data.config?.previewText?.trim() || 'Hello from ZeroAgent Studio'
    setSpeechSpeaking(true)
    try {
      await previewSpeak(text, data.config?.language ?? 'en-US')
    } catch (err) {
      setPreview(err instanceof Error ? err.message : String(err))
    } finally {
      setSpeechSpeaking(false)
    }
  }

  const handleRunWorkflowFromTool = async () => {
    setRunStatus(null)
    try {
      const result = await runWorkflowStarter('tool', nodeId, nodes, edges, apiKeys)
      setRunStatus(formatWorkflowRunResult(result, 'tool'))
    } catch (err) {
      setRunStatus(formatWorkflowRunError(err))
    }
  }

  const handleRunCapture = async () => {
    setRunStatus(null)
    try {
      const result = await runWorkflowStarter('sink', nodeId, nodes, edges, apiKeys)
      setRunStatus(formatWorkflowRunResult(result, 'sink'))
    } catch (err) {
      setRunStatus(formatWorkflowRunError(err))
    }
  }

  const handleCopyOutputLog = async () => {
    try {
      await navigator.clipboard.writeText(formatOutputLogForCopy(data.outputLog))
      setRunStatus({ tone: 'ok', text: 'Copied to clipboard.' })
    } catch {
      setRunStatus({ tone: 'warn', text: 'Copy failed — check clipboard permission.' })
    }
  }

  const handleMaxEntriesChange = (value: string) => {
    const max = parseOutputLogMaxEntries({ maxEntries: value })
    setConfig({ maxEntries: value })
    if (data.outputLog?.length && data.outputLog.length > max) {
      updateNodeData(nodeId, { outputLog: trimOutputLog(data.outputLog, max) })
    }
  }

  return (
    <BaseInspectorShell
      title="Tool settings"
      nodeId={nodeId}
      nodeType="tool"
      label={data.label}
      onLabelChange={(label) => updateNodeData(nodeId, { label })}
    >
        <label>
          Tool type
          <select
            value={data.toolType}
            onChange={(e) => void handleToolTypeChange(e)}
          >
            {listTools().map((t) => {
              const met = isToolRequirementMet(t.requirement, apiKeys)
              const isCurrent = t.id === data.toolType
              return (
                <option key={t.id} value={t.id} disabled={!met && !isCurrent}>
                  {t.label}
                  {!met ? ' — locked' : ''}
                </option>
              )
            })}
          </select>
          <span className="inspector-hint">{tool.description}</span>
        </label>

        {setupMessage && (
          <InspectorSetupNotice
            message={setupMessage}
            onOpenPrivacyKeys={needsKeysButton ? () => openSettings('keys') : undefined}
            onOpenPrivacy={needsKeysButton ? () => openSettings('privacy') : undefined}
          />
        )}

        <PortLegend inputs={tool.inputs} outputs={tool.outputs} />
        <p className="inspector-hint">
          {data.toolType === 'text-output' ? (
            <>
              Wire <strong>In</strong> from upstream tools or <strong>Agent Out</strong>. Each run appends
              here — <strong>Run capture</strong> is for tool-only chains without Chat.
            </>
          ) : starterKind === 'tool' ? (
            <>
              Wire <strong>Out</strong> downstream to chain tools or Agents. This tool can start a workflow
              without upstream input.
            </>
          ) : (
            <>
              Connect <strong>Out → Agent Context</strong>. Runs in parallel with other context blocks.
            </>
          )}
        </p>

        {starterKind === 'tool' && (
          <>
            <button
              type="button"
              className="inspector-action-btn"
              disabled={isRunning}
              onClick={() => void handleRunWorkflowFromTool()}
            >
              {isRunning ? 'Running…' : workflowStarterLabel('tool')}
            </button>
            <p className="inspector-hint">
              Runs this tool and everything wired downstream (including Agents).
            </p>
          </>
        )}

        {runStatus && starterKind === 'tool' && (
          <p className={`inspector-hint ${runStatus.tone === 'warn' ? 'inspector-warn' : ''}`}>
            {runStatus.text}
          </p>
        )}

        {data.toolType === 'text-output' && (
          <>
            <button
              type="button"
              className="inspector-action-btn"
              data-tutorial-target="inspector-run-capture"
              disabled={isRunning || !captureReady}
              title={
                captureReady
                  ? undefined
                  : hasAnyUpstream
                    ? 'Run capture needs a tool-only chain — send from Chat when Chat or Agent is upstream'
                    : 'Wire at least one upstream tool into In'
              }
              onClick={() => void handleRunCapture()}
            >
              {isRunning ? 'Running…' : 'Run capture'}
            </button>
            {!captureReady && (
              <p className="inspector-hint">
                {hasAnyUpstream ? (
                  'Run capture works on tool-only chains. When Chat or Agent is upstream, send from Chat instead.'
                ) : (
                  <>
                    Connect an upstream tool to <strong>In</strong> first.
                  </>
                )}
              </p>
            )}
            {runStatus && (
              <p className={`inspector-hint ${runStatus.tone === 'warn' ? 'inspector-warn' : ''}`}>
                {runStatus.text}
              </p>
            )}
            <label>
              Max history entries
              <input
                type="number"
                min={1}
                max={500}
                value={data.config?.maxEntries ?? '50'}
                onChange={(e) => handleMaxEntriesChange(e.target.value)}
              />
              <span className="inspector-hint">Oldest entries drop off when full. Saved with your workflow.</span>
            </label>
            <div className="output-log-panel" aria-label="Captured output history">
              <div className="output-log-header">
                <strong>{data.outputLog?.length ?? 0} captured</strong>
                <div className="output-log-actions">
                  <button
                    type="button"
                    className="inspector-link-btn"
                    disabled={!data.outputLog?.length}
                    onClick={() => void handleCopyOutputLog()}
                  >
                    Copy all
                  </button>
                  <button
                    type="button"
                    className="inspector-link-btn"
                    disabled={!data.outputLog?.length}
                    onClick={() => void confirm({
                      title: 'Clear capture history?',
                      message: 'This removes all entries from this Text Output block.',
                      confirmLabel: 'Clear',
                      variant: 'danger',
                    }).then((ok) => ok && updateNodeData(nodeId, { outputLog: [] }))}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {data.outputLog?.length ? (
                <ol className="output-log-list">
                  {data.outputLog.map((entry, i) => (
                    <li key={`${entry.timestamp}-${i}`} className="output-log-entry">
                      <time className="output-log-time" dateTime={new Date(entry.timestamp).toISOString()}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </time>
                      <pre className="output-log-text">{entry.text}</pre>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="inspector-hint">No captures yet — run the workflow or click Run capture.</p>
              )}
            </div>
          </>
        )}

        {tool.autoRun && data.toolType !== 'text-output' && (
          <label className="inspector-checkbox-label">
            <input
              type="checkbox"
              checked={resolveToolAutoRun(data, tool)}
              disabled={
                !requirementMet || !tool.autoRun.canRunWithoutInput(data.config ?? {})
              }
              onChange={(e) => updateNodeData(nodeId, { autoRun: e.target.checked })}
            />
            Auto-run when workflow starts
            <span className="inspector-hint">
              {tool.autoRun.canRunWithoutInput(data.config ?? {})
                ? 'Runs without upstream input when enabled'
                : 'Configure this tool so it can run without upstream input'}
            </span>
          </label>
        )}

        {safetyNotice && <ToolSafetyNotice notice={safetyNotice} />}

        {getManifestConfigFields(data.toolType).map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={data.config?.[field.key] ?? ''}
              onChange={(e) => setConfig({ [field.key]: e.target.value })}
              placeholder={field.placeholder}
              disabled={!requirementMet}
            />
            {field.hint && <span className="inspector-hint">{field.hint}</span>}
          </label>
        ))}

        {tool.engine && (
          <>
            <label>
              Sample input
              <textarea
                rows={3}
                value={data.config?.sample ?? ''}
                onChange={(e) => setConfig({ sample: e.target.value })}
                placeholder="Text to test this tool…"
              />
            </label>
            <button
              type="button"
              className="inspector-action-btn"
              disabled={loading || !requirementMet}
              onClick={() =>
                runPreview(() =>
                  runToolForPreview(tool, data.config?.sample ?? '', data.config ?? {}, {
                    apiKeys,
                    log: () => {},
                  })
                )
              }
            >
              {loading ? 'Running…' : 'Run test'}
            </button>
          </>
        )}

        {data.toolType === 'web-scraper' && (
          <>
            <label>
              Default URL
              <input
                value={data.config?.url ?? ''}
                onChange={(e) => setConfig({ url: e.target.value })}
                placeholder="https://en.wikipedia.org/wiki/Pizza"
              />
            </label>
            <button
              type="button"
              className="inspector-action-btn"
              disabled={loading || !data.config?.url?.trim()}
              onClick={() =>
                runPreview(async () => {
                  const normalized = normalizeHttpUrl(data.config?.url ?? '')
                  const result = await scrapeWebPage(normalized)
                  return previewScrapeText(result)
                })
              }
            >
              {loading ? 'Fetching…' : 'Test fetch'}
            </button>
          </>
        )}

        {data.toolType === 'fetch-json' && (() => {
          const method = (data.config?.method ?? 'GET').toUpperCase()
          const methodAllowsBody =
            method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

          return (
            <>
              <label>
                URL (optional if wired upstream)
                <input
                  value={data.config?.url ?? ''}
                  onChange={(e) => setConfig({ url: e.target.value })}
                  placeholder="https://api.example.com/data.json"
                />
              </label>

              <label>
                Method
                <select
                  value={method}
                  onChange={(e) => setConfig({ method: e.target.value })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="HEAD">HEAD</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
              </label>

              <label>
                Headers (JSON, optional)
                <textarea
                  rows={3}
                  className="inspector-code"
                  value={data.config?.headers ?? ''}
                  onChange={(e) => setConfig({ headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer sk-..."}'
                />
                <span className="inspector-hint">
                  Custom headers trigger a CORS preflight — the server must allow them.
                </span>
              </label>

              {methodAllowsBody && (
                <label>
                  Body (JSON or text, optional)
                  <textarea
                    rows={5}
                    className="inspector-code"
                    value={data.config?.body ?? ''}
                    onChange={(e) => setConfig({ body: e.target.value })}
                    placeholder='{"model":"llama-3.1-8b-instant","messages":[{"role":"user","content":"Hi"}]}'
                  />
                  <span className="inspector-hint">
                    Auto-sets Content-Type: application/json when body is valid JSON.
                  </span>
                </label>
              )}

              <p className="inspector-hint">
                Supports <strong>GET, POST, PUT, PATCH, DELETE</strong> with custom headers and body.
                Custom headers and non-GET methods trigger CORS preflight — the target server must
                respond to <code>OPTIONS</code> correctly, or the request will fail.
              </p>
            </>
          )
        })()}

        {data.toolType === 'parse-url' && (
          <p className="inspector-hint">
            Wire a URL string into <strong>In</strong> — outputs JSON with host, path, and query params.
          </p>
        )}

        {data.toolType === 'speech' && (
          <>
            {(data.config?.mode === 'stt' || data.config?.mode === 'both' || !data.config?.mode) &&
              !isSpeechRecognitionAvailable() && (
              <p className="inspector-warn">
                Speech recognition needs Chrome or Edge. Firefox is not supported.
              </p>
            )}
            {(data.config?.mode === 'tts' || data.config?.mode === 'both') &&
              !isSpeechSynthesisAvailable() && (
              <p className="inspector-warn">Text-to-speech is not available in this browser.</p>
            )}
            <label>
              Mode
              <select
                data-tutorial-target="inspector-speech-mode"
                value={data.config?.mode ?? 'stt'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="stt">Speech-to-Text (listen)</option>
                <option value="tts">Text-to-Speech (speak)</option>
                <option value="both">Listen then speak</option>
              </select>
            </label>
            <label>
              Language
              <input
                value={data.config?.language ?? 'en-US'}
                onChange={(e) => setConfig({ language: e.target.value })}
              />
            </label>
            {(data.config?.mode === 'stt' || data.config?.mode === 'both' || !data.config?.mode) && (
              <>
                <p className="inspector-hint">Browser will ask for microphone access.</p>
                <button
                  type="button"
                  className="inspector-action-btn"
                  disabled={speechListening || !isSpeechRecognitionAvailable()}
                  onClick={handleListen}
                >
                  {speechListening ? 'Listening…' : '🎤 Listen'}
                </button>
              </>
            )}
            {(data.config?.mode === 'tts' || data.config?.mode === 'both') && (
              <>
                <label>
                  Preview text
                  <input
                    value={data.config?.previewText ?? ''}
                    onChange={(e) => setConfig({ previewText: e.target.value })}
                  />
                </label>
                <div className="inspector-btn-row">
                  <button
                    type="button"
                    className="inspector-action-btn"
                    disabled={speechSpeaking || !isSpeechSynthesisAvailable()}
                    onClick={handlePlay}
                  >
                    {speechSpeaking ? 'Playing…' : '▶ Play'}
                  </button>
                  <button
                    type="button"
                    className="inspector-action-btn inspector-action-secondary"
                    onClick={() => stopSpeaking()}
                  >
                    Stop
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {data.toolType === 'text-transform' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'trim'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="trim">Trim</option>
                <option value="upper">Uppercase</option>
                <option value="lower">Lowercase</option>
                <option value="split">Split lines</option>
                <option value="regex">Regex extract</option>
                <option value="replace">Regex replace</option>
                <option value="slice">Slice</option>
              </select>
            </label>
            {(data.config?.mode === 'regex' || data.config?.mode === 'replace') && (
              <label>
                Pattern
                <input
                  value={data.config?.pattern ?? ''}
                  onChange={(e) => setConfig({ pattern: e.target.value })}
                />
              </label>
            )}
            {data.config?.mode === 'replace' && (
              <label>
                Replacement
                <input
                  value={data.config?.replacement ?? ''}
                  onChange={(e) => setConfig({ replacement: e.target.value })}
                />
              </label>
            )}
            <button
              type="button"
              className="inspector-action-btn"
              onClick={() =>
                runPreview(() => runTextTransform(data.config?.sample ?? ' sample ', data.config ?? {}))
              }
            >
              Test with sample
            </button>
          </>
        )}

        {data.toolType === 'json-tool' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'pretty'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="pretty">Pretty-print</option>
                <option value="minify">Minify</option>
                <option value="get">Get field</option>
              </select>
            </label>
            {data.config?.mode === 'get' && (
              <label>
                Path (dot notation)
                <input
                  value={data.config?.path ?? ''}
                  onChange={(e) => setConfig({ path: e.target.value })}
                  placeholder="user.name"
                />
              </label>
            )}
            <button
              type="button"
              className="inspector-action-btn"
              onClick={() =>
                runPreview(() => runJsonTool('{"hello":"world"}', data.config ?? {}))
              }
            >
              Test sample JSON
            </button>
          </>
        )}

        {data.toolType === 'datetime' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'format-now'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="format-now">Format now</option>
                <option value="parse">Parse input to ISO</option>
              </select>
              <span className="inspector-hint">
                Format now needs no upstream wire — use Out → Agent Context in parallel with Chat.
              </span>
            </label>
            <button
              type="button"
              className="inspector-action-btn"
              onClick={() => runPreview(() => runDatetimeTool('', data.config ?? {}))}
            >
              Test
            </button>
          </>
        )}

        {data.toolType === 'calculator' && (
          <>
            <p className="inspector-hint">
              Wire <strong>text</strong> with a math expression like <code>2+2</code> or{' '}
              <code>(10 - 3) * 2</code>. Allowed: digits and <code>+ - * / ( ) . %</code>. The field below
              is used when nothing is wired in.
            </p>
            <label>
              Expression (optional — uses upstream wire when empty)
              <input
                value={data.config?.expression ?? ''}
                onChange={(e) => setConfig({ expression: e.target.value })}
                placeholder="(2 + 3) * 4"
              />
            </label>
            <button
              type="button"
              className="inspector-action-btn"
              onClick={() => runPreview(() => runCalculator('2+2', data.config ?? {}))}
            >
              Test 2+2
            </button>
          </>
        )}

        {data.toolType === 'clipboard' && (
          <label>
            Mode
            <select
              value={data.config?.mode ?? 'read'}
              onChange={(e) => setConfig({ mode: e.target.value })}
            >
              <option value="read">Read clipboard</option>
              <option value="write">Write upstream to clipboard</option>
            </select>
          </label>
        )}

        {(data.toolType === 'gemini-embeddings' || data.toolType === 'openrouter-embeddings') && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'similarity'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="similarity">Similarity score</option>
                <option value="embed">Embedding preview</option>
              </select>
            </label>
            {data.config?.mode !== 'embed' && (
              <label>
                Reference text
                <textarea
                  rows={3}
                  value={data.config?.reference ?? ''}
                  onChange={(e) => setConfig({ reference: e.target.value })}
                />
              </label>
            )}
          </>
        )}

        {data.toolType === 'gemini-vision' && (
          <label>
            Default prompt (if upstream empty)
            <input
              value={data.config?.prompt ?? ''}
              onChange={(e) => setConfig({ prompt: e.target.value })}
              placeholder="Describe this image"
            />
          </label>
        )}

        {data.toolType === 'groq-transcribe' && (
          <label>
            Language (optional)
            <input
              value={data.config?.language ?? ''}
              onChange={(e) => setConfig({ language: e.target.value })}
              placeholder="en"
            />
          </label>
        )}

        {data.toolType === 'custom-script' && (
          <>
            <label>
              Script (async — return a string)
              <textarea
                rows={10}
                className="inspector-code"
                data-tutorial-target="inspector-custom-script"
                value={data.config?.script ?? ''}
                onChange={(e) => {
                  if (e.target.value.length <= CUSTOM_SCRIPT_MAX_BYTES) {
                    setConfig({ script: e.target.value })
                  }
                }}
                placeholder={'return helpers.trim(input)'}
              />
            </label>
            <label>
              Test input
              <input
                value={data.config?.sample ?? ''}
                onChange={(e) => setConfig({ sample: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="inspector-action-btn"
              disabled={loading || !data.config?.script?.trim()}
              onClick={() =>
                runPreview(() =>
                  runCustomScript(data.config?.sample ?? '', {
                    ...data.config,
                    script: data.config?.script ?? '',
                  })
                )
              }
            >
              {loading ? 'Running…' : 'Run test'}
            </button>
          </>
        )}

        {preview && <pre className="inspector-preview">{preview}</pre>}
    </BaseInspectorShell>
  )
}
