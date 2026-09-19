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
import { runPython } from '../../tools/pythonRunner'
import {
  parseMultiInputFields,
  serializeMultiInputFields,
  createEmptyField,
  type MultiInputField,
} from '../../tools/multiInput'
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
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: {
  nodeId: string
  data: ToolNodeData
  updateNodeData: (id: string, data: Partial<ToolNodeData>) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  mobileOpen?: boolean
  onCloseMobile?: () => void
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
    const text = data.config?.previewText?.trim() || 'Hello from Brainwire'
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
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      mobileOpen={mobileOpen}
      onCloseMobile={onCloseMobile}
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

        {getManifestConfigFields(data.toolType).map((field) => {
          const inputType = field.type === 'number'
            ? 'number'
            : field.type === 'password'
              ? 'password'
              : 'text'
          return (
            <label key={field.key}>
              {field.label}
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  value={data.config?.[field.key] ?? ''}
                  onChange={(e) => setConfig({ [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  disabled={!requirementMet}
                />
              ) : field.type === 'select' ? (
                <select
                  value={data.config?.[field.key] ?? field.placeholder ?? ''}
                  onChange={(e) => setConfig({ [field.key]: e.target.value })}
                  disabled={!requirementMet}
                >
                  {!field.placeholder && <option value="">—</option>}
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={inputType}
                  value={data.config?.[field.key] ?? ''}
                  onChange={(e) => setConfig({ [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  disabled={!requirementMet}
                  autoComplete={field.type === 'password' ? 'off' : undefined}
                />
              )}
              {field.hint && <span className="inspector-hint">{field.hint}</span>}
            </label>
          )
        })}

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
              </p>
            </>
          )
        })()}

        {data.toolType === 'multi-input' && (() => {
          const fields = parseMultiInputFields(data.config?.fields)

          const updateFields = (next: MultiInputField[]) => {
            setConfig({ fields: serializeMultiInputFields(next) })
          }

          const addField = () => {
            updateFields([...fields, createEmptyField(fields.length + 1)])
          }

          const removeField = (i: number) => {
            updateFields(fields.filter((_, idx) => idx !== i))
          }

          const updateField = (i: number, patch: Partial<MultiInputField>) => {
            updateFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
          }

          const duplicateKey = (() => {
            const seen = new Set<string>()
            for (const f of fields) {
              if (seen.has(f.key)) return f.key
              seen.add(f.key)
            }
            return null
          })()

          return (
            <>
              <p className="inspector-hint">
                Add named fields — the node outputs them as a single JSON object.
                Wire upstream text into the field&apos;s value by leaving it blank.
              </p>

              <div className="multi-input-grid">
                <div className="multi-input-header">
                  <span>Key</span>
                  <span>Value</span>
                  <span></span>
                </div>
                {fields.length === 0 && (
                  <p className="inspector-hint multi-input-empty">
                    No fields yet. Click <strong>+ Add field</strong> to start.
                  </p>
                )}
                {fields.map((field, i) => (
                  <div className="multi-input-row" key={i}>
                    <input
                      className="multi-input-key"
                      value={field.key}
                      onChange={(e) => updateField(i, { key: e.target.value })}
                      placeholder="seed"
                    />
                    <input
                      className="multi-input-value"
                      value={field.value ?? ''}
                      onChange={(e) => updateField(i, { value: e.target.value })}
                      placeholder="personal finance (or wire upstream)"
                    />
                    <button
                      type="button"
                      className="inspector-link-btn multi-input-remove"
                      title="Remove field"
                      onClick={() => removeField(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="inspector-action-btn"
                onClick={addField}
              >
                + Add field
              </button>

              {duplicateKey && (
                <p className="inspector-warn">
                  Duplicate key: &quot;{duplicateKey}&quot; — remove or rename before running.
                </p>
              )}

              <label>
                Test input (optional)
                <input
                  value={data.config?.sample ?? ''}
                  onChange={(e) => setConfig({ sample: e.target.value })}
                />
              </label>
            </>
          )
        })()}

        {data.toolType === 'string-template' && (
          <>
            <label>
              Template (uses {'{{variable}}'} syntax)
              <textarea
                rows={5}
                className="inspector-code"
                value={data.config?.template ?? ''}
                onChange={(e) => setConfig({ template: e.target.value })}
                placeholder="Hello {{name}}, you have {{count}} items."
              />
            </label>
            <label>
              Variables (JSON, optional)
              <textarea
                rows={3}
                className="inspector-code"
                value={data.config?.variables ?? ''}
                onChange={(e) => setConfig({ variables: e.target.value })}
                placeholder='{"name":"Alice","count":"5"}'
              />
            </label>
          </>
        )}

        {data.toolType === 'array-filter' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'truthy'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="truthy">Truthy (keep non-empty)</option>
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
                <option value="greater">Greater than</option>
                <option value="less">Less than</option>
              </select>
            </label>
            <label>
              Key (property to check, optional)
              <input
                value={data.config?.key ?? ''}
                onChange={(e) => setConfig({ key: e.target.value })}
                placeholder="views"
              />
            </label>
            <label>
              Value (for contains/equals/greater/less)
              <input
                value={data.config?.value ?? ''}
                onChange={(e) => setConfig({ value: e.target.value })}
                placeholder="1000"
              />
            </label>
          </>
        )}

        {data.toolType === 'array-map' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'extract'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="extract">Extract key</option>
                <option value="stringify">Stringify each item</option>
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="number">Convert to number</option>
              </select>
            </label>
            {(data.config?.mode ?? 'extract') === 'extract' && (
              <label>
                Key
                <input
                  value={data.config?.key ?? ''}
                  onChange={(e) => setConfig({ key: e.target.value })}
                  placeholder="title"
                />
              </label>
            )}
          </>
        )}

        {data.toolType === 'array-sort' && (
          <>
            <label>
              Key (property to sort by, optional)
              <input
                value={data.config?.key ?? ''}
                onChange={(e) => setConfig({ key: e.target.value })}
                placeholder="views"
              />
            </label>
            <label>
              Order
              <select
                value={data.config?.order ?? 'asc'}
                onChange={(e) => setConfig({ order: e.target.value })}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
            <label>
              Type
              <select
                value={data.config?.type ?? 'auto'}
                onChange={(e) => setConfig({ type: e.target.value })}
              >
                <option value="auto">Auto</option>
                <option value="number">Number</option>
                <option value="string">String</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'array-dedupe' && (
          <label>
            Key (property for uniqueness, optional)
            <input
              value={data.config?.key ?? ''}
              onChange={(e) => setConfig({ key: e.target.value })}
              placeholder="id"
            />
            <span className="inspector-hint">Leave empty to compare whole items.</span>
          </label>
        )}

        {data.toolType === 'array-group-by' && (
          <label>
            Key (property to group by)
            <input
              value={data.config?.key ?? ''}
              onChange={(e) => setConfig({ key: e.target.value })}
              placeholder="category"
            />
          </label>
        )}

        {data.toolType === 'array-chunk' && (
          <label>
            Chunk size
            <input
              type="number"
              min={1}
              value={data.config?.size ?? '10'}
              onChange={(e) => setConfig({ size: e.target.value })}
            />
          </label>
        )}

        {data.toolType === 'array-slice' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'range'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="range">Range (start → end)</option>
                <option value="first">First N</option>
                <option value="last">Last N</option>
              </select>
            </label>
            {(data.config?.mode ?? 'range') === 'range' ? (
              <>
                <label>
                  Start index
                  <input
                    type="number"
                    min={0}
                    value={data.config?.start ?? '0'}
                    onChange={(e) => setConfig({ start: e.target.value })}
                  />
                </label>
                <label>
                  End index (exclusive)
                  <input
                    type="number"
                    min={0}
                    value={data.config?.end ?? ''}
                    onChange={(e) => setConfig({ end: e.target.value })}
                    placeholder="(empty = to end)"
                  />
                </label>
              </>
            ) : (
              <label>
                Count
                <input
                  type="number"
                  min={0}
                  value={data.config?.count ?? '10'}
                  onChange={(e) => setConfig({ count: e.target.value })}
                />
              </label>
            )}
          </>
        )}

        {data.toolType === 'loop-over' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'extract'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="extract">Extract key</option>
                <option value="stringify">Stringify</option>
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="trim">Trim</option>
                <option value="number">Number</option>
                <option value="length">Length</option>
              </select>
            </label>
            <label>
              Key (optional)
              <input
                value={data.config?.key ?? ''}
                onChange={(e) => setConfig({ key: e.target.value })}
                placeholder="title"
              />
            </label>
            <label>
              Pre-filter (optional)
              <input
                value={data.config?.filter ?? ''}
                onChange={(e) => setConfig({ filter: e.target.value })}
                placeholder="truthy | contains:X | equals:Y"
              />
            </label>
          </>
        )}

        {data.toolType === 'batch-split' && (
          <>
            <label>
              Batch size
              <input
                type="number"
                min={1}
                value={data.config?.size ?? '50'}
                onChange={(e) => setConfig({ size: e.target.value })}
              />
            </label>
            <label className="inspector-checkbox-label">
              <input
                type="checkbox"
                checked={data.config?.wrap === 'true'}
                onChange={(e) => setConfig({ wrap: e.target.checked ? 'true' : '' })}
              />
              Wrap with metadata
            </label>
          </>
        )}

        {data.toolType === 'json-path' && (
          <label>
            Path
            <input
              value={data.config?.path ?? ''}
              onChange={(e) => setConfig({ path: e.target.value })}
              placeholder="data.users[0].email"
            />
          </label>
        )}

        {data.toolType === 'json-merge' && (
          <>
            <label>
              Other JSON (required)
              <textarea
                rows={5}
                className="inspector-code"
                value={data.config?.other ?? ''}
                onChange={(e) => setConfig({ other: e.target.value })}
                placeholder='{"extra":"value"}'
              />
            </label>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'deep'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="deep">Deep merge</option>
                <option value="shallow">Shallow merge</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'json-flatten' && (
          <>
            <label>
              Separator
              <input
                value={data.config?.separator ?? '.'}
                onChange={(e) => setConfig({ separator: e.target.value })}
                placeholder="."
              />
            </label>
            <label>
              Arrays
              <select
                value={data.config?.arrays ?? 'index'}
                onChange={(e) => setConfig({ arrays: e.target.value })}
              >
                <option value="index">Index with [0], [1]</option>
                <option value="keep">Keep arrays intact</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'json-pick' && (
          <label>
            Keys (comma-separated)
            <input
              value={data.config?.keys ?? ''}
              onChange={(e) => setConfig({ keys: e.target.value })}
              placeholder="id,title,views"
            />
          </label>
        )}

        {data.toolType === 'json-diff' && (
          <>
            <label>
              Other JSON (required)
              <textarea
                rows={5}
                className="inspector-code"
                value={data.config?.other ?? ''}
                onChange={(e) => setConfig({ other: e.target.value })}
                placeholder='{"a":1}'
              />
            </label>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'full'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="full">Full diff</option>
                <option value="summary">Summary only</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'csv-export' && (
          <>
            <label>
              Columns (comma-separated, optional)
              <input
                value={data.config?.columns ?? ''}
                onChange={(e) => setConfig({ columns: e.target.value })}
                placeholder="id,title,views"
              />
            </label>
            <label>
              Delimiter
              <select
                value={data.config?.delimiter ?? ','}
                onChange={(e) => setConfig({ delimiter: e.target.value })}
              >
                <option value=",">Comma (,)</option>
                <option value="\t">Tab</option>
                <option value=";">Semicolon (;)</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'csv-to-json' && (
          <>
            <label>
              Delimiter
              <select
                value={data.config?.delimiter ?? ','}
                onChange={(e) => setConfig({ delimiter: e.target.value })}
              >
                <option value=",">Comma (,)</option>
                <option value="\t">Tab</option>
                <option value=";">Semicolon (;)</option>
                <option value="|">Pipe (|)</option>
              </select>
            </label>
            <label className="inspector-checkbox-label">
              <input
                type="checkbox"
                checked={data.config?.header !== 'false'}
                onChange={(e) => setConfig({ header: e.target.checked ? '' : 'false' })}
              />
              First row is header
            </label>
          </>
        )}

        {data.toolType === 'text-chunk' && (
          <>
            <label>
              Chunk size (chars)
              <input
                type="number"
                min={50}
                value={data.config?.size ?? '2000'}
                onChange={(e) => setConfig({ size: e.target.value })}
              />
            </label>
            <label>
              Overlap (chars)
              <input
                type="number"
                min={0}
                value={data.config?.overlap ?? '0'}
                onChange={(e) => setConfig({ overlap: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'text-truncate' && (
          <>
            <label>
              Max length
              <input
                type="number"
                min={1}
                value={data.config?.length ?? '100'}
                onChange={(e) => setConfig({ length: e.target.value })}
              />
            </label>
            <label>
              Suffix
              <input
                value={data.config?.suffix ?? '…'}
                onChange={(e) => setConfig({ suffix: e.target.value })}
              />
            </label>
            <label className="inspector-checkbox-label">
              <input
                type="checkbox"
                checked={data.config?.words === 'true'}
                onChange={(e) => setConfig({ words: e.target.checked ? 'true' : '' })}
              />
              Cut at word boundary
            </label>
          </>
        )}

        {data.toolType === 'text-extract' && (
          <label>
            Mode
            <select
              value={data.config?.mode ?? 'all'}
              onChange={(e) => setConfig({ mode: e.target.value })}
            >
              <option value="all">All types</option>
              <option value="emails">Emails only</option>
              <option value="urls">URLs only</option>
              <option value="phones">Phones only</option>
              <option value="numbers">Numbers only</option>
              <option value="hashtags">Hashtags only</option>
            </select>
          </label>
        )}

        {data.toolType === 'text-split' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'delimiter'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="delimiter">Delimiter</option>
                <option value="regex">Regex</option>
                <option value="lines">Lines</option>
                <option value="words">Words</option>
                <option value="chars">Characters</option>
              </select>
            </label>
            {data.config?.mode === 'delimiter' && (
              <label>
                Delimiter
                <input
                  value={data.config?.delimiter ?? ','}
                  onChange={(e) => setConfig({ delimiter: e.target.value })}
                />
              </label>
            )}
            {data.config?.mode === 'regex' && (
              <label>
                Regex pattern
                <input
                  value={data.config?.pattern ?? ''}
                  onChange={(e) => setConfig({ pattern: e.target.value })}
                  placeholder="\\s+"
                />
              </label>
            )}
          </>
        )}

        {data.toolType === 'text-join' && (
          <>
            <label>
              Separator
              <input
                value={data.config?.separator ?? ', '}
                onChange={(e) => setConfig({ separator: e.target.value })}
              />
            </label>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'plain'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="plain">Plain</option>
                <option value="json">JSON stringify each</option>
                <option value="numbered">Numbered list</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'regex-extract' && (
          <>
            <label>
              Pattern
              <input
                value={data.config?.pattern ?? ''}
                onChange={(e) => setConfig({ pattern: e.target.value })}
                placeholder="\\d+"
              />
            </label>
            <label>
              Flags
              <input
                value={data.config?.flags ?? 'g'}
                onChange={(e) => setConfig({ flags: e.target.value })}
                placeholder="g"
              />
            </label>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'matches'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="matches">All matches</option>
                <option value="groups">With groups</option>
                <option value="first">First match</option>
                <option value="replace">Replace</option>
              </select>
            </label>
            {data.config?.mode === 'replace' && (
              <label>
                Replacement
                <input
                  value={data.config?.replace ?? ''}
                  onChange={(e) => setConfig({ replace: e.target.value })}
                />
              </label>
            )}
          </>
        )}

        {data.toolType === 'hash-text' && (
          <>
            <label>
              Algorithm
              <select
                value={data.config?.algorithm ?? 'SHA-256'}
                onChange={(e) => setConfig({ algorithm: e.target.value })}
              >
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-384">SHA-384</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </label>
            <label>
              Encoding
              <select
                value={data.config?.encoding ?? 'hex'}
                onChange={(e) => setConfig({ encoding: e.target.value })}
              >
                <option value="hex">Hex</option>
                <option value="base64">Base64</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'base64-codec' && (
          <label>
            Mode
            <select
              value={data.config?.mode ?? 'encode'}
              onChange={(e) => setConfig({ mode: e.target.value })}
            >
              <option value="encode">Encode to base64</option>
              <option value="decode">Decode from base64</option>
            </select>
          </label>
        )}

        {data.toolType === 'retry-backoff' && (
          <>
            <label>
              URL
              <input
                value={data.config?.url ?? ''}
                onChange={(e) => setConfig({ url: e.target.value })}
                placeholder="https://api.example.com/data"
              />
            </label>
            <label>
              Method
              <select
                value={data.config?.method ?? 'GET'}
                onChange={(e) => setConfig({ method: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </label>
            <label>
              Headers (JSON)
              <textarea
                rows={3}
                className="inspector-code"
                value={data.config?.headers ?? ''}
                onChange={(e) => setConfig({ headers: e.target.value })}
                placeholder='{"Authorization": "Bearer ..."}'
              />
            </label>
            {(data.config?.method ?? 'GET') !== 'GET' && (
              <label>
                Body
                <textarea
                  rows={3}
                  className="inspector-code"
                  value={data.config?.body ?? ''}
                  onChange={(e) => setConfig({ body: e.target.value })}
                />
              </label>
            )}
            <label>
              Max attempts
              <input
                type="number"
                min={1}
                value={data.config?.maxAttempts ?? '3'}
                onChange={(e) => setConfig({ maxAttempts: e.target.value })}
              />
            </label>
            <label>
              Base delay (ms)
              <input
                type="number"
                min={50}
                value={data.config?.baseDelayMs ?? '500'}
                onChange={(e) => setConfig({ baseDelayMs: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'variable-store' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'set'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="set">Set (write)</option>
                <option value="get">Get (read)</option>
                <option value="append">Append to array</option>
                <option value="clear">Clear namespace</option>
              </select>
            </label>
            <label>
              Namespace
              <input
                value={data.config?.namespace ?? 'default'}
                onChange={(e) => setConfig({ namespace: e.target.value })}
              />
            </label>
            {data.config?.mode !== 'clear' && (
              <label>
                Key
                <input
                  value={data.config?.key ?? ''}
                  onChange={(e) => setConfig({ key: e.target.value })}
                  placeholder="seed"
                />
              </label>
            )}
            {(data.config?.mode === 'set' || data.config?.mode === 'append') && (
              <label>
                Value (JSON or text)
                <input
                  value={data.config?.value ?? ''}
                  onChange={(e) => setConfig({ value: e.target.value })}
                />
              </label>
            )}
            <label>
              TTL (ms, 0 = never)
              <input
                type="number"
                min={0}
                value={data.config?.ttlMs ?? '0'}
                onChange={(e) => setConfig({ ttlMs: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'cache' && (
          <>
            <label>
              Mode
              <select
                value={data.config?.mode ?? 'get'}
                onChange={(e) => setConfig({ mode: e.target.value })}
              >
                <option value="get">Get (read)</option>
                <option value="set">Set (write)</option>
                <option value="has">Has (check)</option>
                <option value="clear">Clear all</option>
              </select>
            </label>
            {data.config?.mode !== 'clear' && (
              <label>
                Key
                <input
                  value={data.config?.key ?? ''}
                  onChange={(e) => setConfig({ key: e.target.value })}
                />
              </label>
            )}
            {data.config?.mode === 'set' && (
              <>
                <label>
                  Value
                  <input
                    value={data.config?.value ?? ''}
                    onChange={(e) => setConfig({ value: e.target.value })}
                  />
                </label>
                <label>
                  TTL (ms, default 24h)
                  <input
                    type="number"
                    min={0}
                    value={data.config?.ttlMs ?? '86400000'}
                    onChange={(e) => setConfig({ ttlMs: e.target.value })}
                  />
                </label>
              </>
            )}
            {data.config?.mode === 'get' && (
              <label>
                Fallback (if key missing)
                <input
                  value={data.config?.fallback ?? ''}
                  onChange={(e) => setConfig({ fallback: e.target.value })}
                />
              </label>
            )}
          </>
        )}

        {data.toolType === 'timer' && (
          <>
            <label>
              Action
              <select
                value={data.config?.action ?? 'start'}
                onChange={(e) => setConfig({ action: e.target.value })}
              >
                <option value="start">Start</option>
                <option value="stop">Stop</option>
                <option value="reset">Reset</option>
              </select>
            </label>
            <label>
              Timer name
              <input
                value={data.config?.key ?? 'default'}
                onChange={(e) => setConfig({ key: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'webhook-send' && (
          <>
            <label>
              URL
              <input
                value={data.config?.url ?? ''}
                onChange={(e) => setConfig({ url: e.target.value })}
                placeholder="https://hooks.example.com/..."
              />
            </label>
            <label>
              Method
              <select
                value={data.config?.method ?? 'POST'}
                onChange={(e) => setConfig({ method: e.target.value })}
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>
            <label>
              Headers (JSON)
              <textarea
                rows={3}
                className="inspector-code"
                value={data.config?.headers ?? ''}
                onChange={(e) => setConfig({ headers: e.target.value })}
              />
            </label>
            <label>
              Body (empty = use input)
              <textarea
                rows={3}
                className="inspector-code"
                value={data.config?.body ?? ''}
                onChange={(e) => setConfig({ body: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'email-send' && (
          <>
            <label>
              Provider
              <select
                value={data.config?.provider ?? 'resend'}
                onChange={(e) => setConfig({ provider: e.target.value })}
              >
                <option value="resend">Resend</option>
                <option value="postmark">Postmark</option>
              </select>
            </label>
            <label>
              API Key
              <input
                type="password"
                value={data.config?.apiKey ?? ''}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
              />
            </label>
            <label>
              From
              <input
                value={data.config?.from ?? ''}
                onChange={(e) => setConfig({ from: e.target.value })}
                placeholder="you@example.com"
              />
            </label>
            <label>
              To (comma-separated)
              <input
                value={data.config?.to ?? ''}
                onChange={(e) => setConfig({ to: e.target.value })}
                placeholder="a@x.com, b@y.com"
              />
            </label>
            <label>
              Subject
              <input
                value={data.config?.subject ?? ''}
                onChange={(e) => setConfig({ subject: e.target.value })}
              />
            </label>
            <label>
              Body (empty = use input)
              <textarea
                rows={4}
                className="inspector-code"
                value={data.config?.body ?? ''}
                onChange={(e) => setConfig({ body: e.target.value })}
              />
            </label>
            <label className="inspector-checkbox-label">
              <input
                type="checkbox"
                checked={data.config?.html === 'true'}
                onChange={(e) => setConfig({ html: e.target.checked ? 'true' : '' })}
              />
              Send as HTML
            </label>
          </>
        )}

        {data.toolType === 'google-sheets' && (
          <>
            <label>
              Apps Script Webhook URL
              <input
                value={data.config?.url ?? ''}
                onChange={(e) => setConfig({ url: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
              />
            </label>
            <label>
              Sheet name
              <input
                value={data.config?.sheet ?? 'Sheet1'}
                onChange={(e) => setConfig({ sheet: e.target.value })}
              />
            </label>
            <label>
              Values (JSON array)
              <textarea
                rows={3}
                className="inspector-code"
                value={data.config?.values ?? ''}
                onChange={(e) => setConfig({ values: e.target.value })}
                placeholder='["value1", "value2"]'
              />
            </label>
            <label>
              Shared token (optional)
              <input
                value={data.config?.token ?? ''}
                onChange={(e) => setConfig({ token: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'google-analytics' && (
          <>
            <label>
              Access Token
              <input
                type="password"
                value={data.config?.accessToken ?? ''}
                onChange={(e) => setConfig({ accessToken: e.target.value })}
              />
            </label>
            <label>
              Property ID
              <input
                value={data.config?.propertyId ?? ''}
                onChange={(e) => setConfig({ propertyId: e.target.value })}
                placeholder="properties/123456789"
              />
            </label>
            <label>
              Days back
              <input
                type="number"
                min={1}
                value={data.config?.days ?? '7'}
                onChange={(e) => setConfig({ days: e.target.value })}
              />
            </label>
            <label>
              Metrics (comma-separated)
              <input
                value={data.config?.metrics ?? 'sessions,users'}
                onChange={(e) => setConfig({ metrics: e.target.value })}
              />
            </label>
            <label>
              Dimensions (comma-separated)
              <input
                value={data.config?.dimensions ?? 'date'}
                onChange={(e) => setConfig({ dimensions: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'youtube-analytics' && (
          <>
            <label>
              YouTube API Key
              <input
                type="password"
                value={data.config?.apiKey ?? ''}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
              />
            </label>
            <label>
              Video ID (empty = use input)
              <input
                value={data.config?.videoId ?? ''}
                onChange={(e) => setConfig({ videoId: e.target.value })}
                placeholder="dQw4w9WgXcQ"
              />
            </label>
            <label>
              Part
              <input
                value={data.config?.part ?? 'snippet,statistics,contentDetails,status'}
                onChange={(e) => setConfig({ part: e.target.value })}
              />
            </label>
          </>
        )}

        {data.toolType === 'telegram-send' && (
          <>
            <label>
              Bot Token
              <input
                type="password"
                value={data.config?.botToken ?? ''}
                onChange={(e) => setConfig({ botToken: e.target.value })}
              />
            </label>
            <label>
              Chat ID
              <input
                value={data.config?.chatId ?? ''}
                onChange={(e) => setConfig({ chatId: e.target.value })}
              />
            </label>
            <label>
              Message (empty = use input)
              <textarea
                rows={3}
                className="inspector-code"
                value={data.config?.text ?? ''}
                onChange={(e) => setConfig({ text: e.target.value })}
              />
            </label>
            <label>
              Parse Mode
              <select
                value={data.config?.parseMode ?? ''}
                onChange={(e) => setConfig({ parseMode: e.target.value })}
              >
                <option value="">None</option>
                <option value="Markdown">Markdown</option>
                <option value="HTML">HTML</option>
              </select>
            </label>
          </>
        )}

        {data.toolType === 'notion-api' && (
          <>
            <label>
              Integration Token
              <input
                type="password"
                value={data.config?.apiKey ?? ''}
                onChange={(e) => setConfig({ apiKey: e.target.value })}
              />
            </label>
            <label>
              Action
              <select
                value={data.config?.action ?? 'create'}
                onChange={(e) => setConfig({ action: e.target.value })}
              >
                <option value="create">Create page</option>
                <option value="query">Query database</option>
              </select>
            </label>
            <label>
              Database ID
              <input
                value={data.config?.databaseId ?? ''}
                onChange={(e) => setConfig({ databaseId: e.target.value })}
              />
            </label>
            {data.config?.action !== 'query' && (
              <>
                <label>
                  Page title
                  <input
                    value={data.config?.title ?? ''}
                    onChange={(e) => setConfig({ title: e.target.value })}
                  />
                </label>
                <label>
                  Body (empty = use input)
                  <textarea
                    rows={3}
                    className="inspector-code"
                    value={data.config?.body ?? ''}
                    onChange={(e) => setConfig({ body: e.target.value })}
                  />
                </label>
              </>
            )}
          </>
        )}

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
              Wire a math expression like <code>2+2</code>.
            </p>
            <label>
              Expression (optional)
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

        {data.toolType === 'python' && (
          <>
            <p className="inspector-hint">
              Python 3.12 runs in your browser via Pyodide. Use <code>input_text</code>{' '}
              for input, set <code>result</code> or use <code>print()</code> for output.
            </p>

            <label>
              Python code
              <textarea
                rows={15}
                className="inspector-code"
                value={data.config?.code ?? ''}
                onChange={(e) => setConfig({ code: e.target.value })}
                placeholder={`# input_text is available
# set 'result' or use print()

import pandas as pd
from io import StringIO

df = pd.read_csv(StringIO(input_text))
result = df.describe().to_string()`}
              />
            </label>

            <label>
              Packages to load (comma-separated, optional)
              <input
                value={data.config?.packages ?? ''}
                onChange={(e) => setConfig({ packages: e.target.value })}
                placeholder="pandas, numpy, scikit-learn"
              />
              <span className="inspector-hint">
                First run downloads ~20 MB. Cached after.
              </span>
            </label>

            <label>
              Test input
              <input
                value={data.config?.sample ?? ''}
                onChange={(e) => setConfig({ sample: e.target.value })}
                placeholder="hello world"
              />
            </label>

            <button
              type="button"
              className="inspector-action-btn"
              disabled={loading || !data.config?.code?.trim()}
              onClick={() =>
                runPreview(() =>
                  runPython(data.config?.sample ?? '', {
                    ...data.config,
                    code: data.config?.code ?? '',
                  })
                )
              }
            >
              {loading ? 'Running Python…' : 'Run Python'}
            </button>
          </>
        )}

        {preview && <pre className="inspector-preview">{preview}</pre>}
    </BaseInspectorShell>
  )
}
