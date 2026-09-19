import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import './guide.css'
import { navigateTo } from '../../lib/appRoute'
import { getSiteStats } from '../../lib/siteStats'
import { getQuestCatalog } from '../../lib/tutorialQuests'
import {
  EXAMPLE_CATEGORY_LABELS,
  getExampleKeyBadgeLabel,
  listExampleWorkflows,
} from '../../lib/exampleWorkflows'
import SponsorCryptoTable from './SponsorCryptoTable'

const SECTIONS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'quests', label: 'Guided quests' },
  { id: 'interface', label: 'The screen' },
  { id: 'nodes', label: 'Building blocks' },
  { id: 'wiring', label: 'Connecting blocks' },
  { id: 'running', label: 'When you press send' },
  { id: 'text-output', label: 'Text Output' },
  { id: 'brains', label: 'Choosing an AI' },
  { id: 'tools', label: 'Tools explained' },
  { id: 'staying-safe', label: 'Staying safe' },
  { id: 'privacy', label: 'Privacy & trust' },
  { id: 'examples', label: 'Ideas to try' },
  { id: 'debug', label: 'Activity log' },
  { id: 'save', label: 'Saving your work' },
  { id: 'tips', label: 'When something breaks' },
  { id: 'opensource', label: 'Open source & support' },
  { id: 'faq', label: 'FAQ' },
] as const

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function GuidePage() {
  const stats = getSiteStats()
  const exampleWorkflows = listExampleWorkflows()
  const [activeSection, setActiveSection] = useState<string>('welcome')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] }
    )

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="guide-layout">
      <nav className="guide-toc" aria-label="Guide sections">
        <p className="guide-toc-title">On this page</p>
        <ul>
          {SECTIONS.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                className={`guide-toc-link ${activeSection === id ? 'active' : ''}`}
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <article className="guide-content">
        <motion.section
          id="welcome"
          className="guide-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="guide-hero-badge">Free · In your browser · Nothing to install</span>
          <h1>How to use Brainwire</h1>
          <p className="guide-lead">
            Imagine a flowchart where each box can do something useful — read your notes, open a web
            page, listen to you speak, or ask an AI a question. You draw the chart, connect the boxes
            with typed ports (colored dots), and the app runs them in order. All of this happens in your
            browser. You can start for <strong>free</strong>: no credit card, no API key, no new computer.
            <strong>{stats.guidedQuests} guided quests</strong> walk you through real workflows if you prefer learning
            by doing.
          </p>
          <div className="guide-hero-cards">
            <div className="guide-mini-card">
              <span className="guide-mini-icon">🎯</span>
              <strong>You need</strong>
              <span>A recent browser and a few minutes</span>
            </div>
            <div className="guide-mini-card">
              <span className="guide-mini-icon">⏱️</span>
              <strong>First reply in</strong>
              <span>~2 minutes with Examples</span>
            </div>
            <div className="guide-mini-card">
              <span className="guide-mini-icon">🔒</span>
              <strong>Your data</strong>
              <span>No account · no analytics · keys never sent to us</span>
            </div>
          </div>
        </motion.section>

        <section id="quick-start" className="guide-section">
          <h2>Quick start — three steps to your first answer</h2>
          <p>
            No theory yet. Just do this and watch it work — that is the fastest way from &ldquo;what
            is this?&rdquo; to &ldquo;oh, it actually replied.&rdquo;
          </p>
          <ol className="guide-steps">
            <li>
              <span className="guide-step-num">1</span>
              <div>
                <strong>Click &ldquo;Examples&rdquo;</strong> at the top, then pick <strong>Hello, Agent</strong>.
                <p>
                  Two blocks appear on the canvas — <em>Chat</em> (where you type) and{' '}
                  <em>Agent</em> (the AI) — already linked. Works without a key; for faster replies,
                  paste a free OpenRouter key in <strong>Privacy &amp; keys</strong> first.
                </p>
              </div>
            </li>
            <li>
              <span className="guide-step-num">2</span>
              <div>
                <strong>Type a question</strong> in the Chat block and press Enter (or ▶).
                <p>
                  Try: <code>Explain photosynthesis in two simple sentences.</code>
                </p>
              </div>
            </li>
            <li>
              <span className="guide-step-num">3</span>
              <div>
                <strong>Wait for the reply</strong> (first local run may download a model).
                <p>
                  With a free OpenRouter key, answers are usually fast with no download. Without a key,
                  a bar at the top may show progress while Transformers.js loads a small model into your
                  browser — like downloading a level once. Your answer appears in Chat when everything finishes.
                </p>
              </div>
            </li>
          </ol>
          <div className="guide-callout guide-callout--tip">
            <strong>Want a guided tour?</strong> On the welcome screen, pick any of the eight quests
            (Snack, Pipeline, Encoding, Parallel, Writer&apos;s room, URL detective, Voice booth, Capture desk).
            Replay any time from the header <strong>Quests</strong> menu.
          </div>
          <div className="guide-callout guide-callout--tip">
            <strong>Feels slow the first time?</strong> Totally normal. You are pulling a small AI
            brain into browser storage. Coffee break length on slow Wi‑Fi. Later runs are much
            snappier.
          </div>
        </section>

        <section id="quests" className="guide-section">
          <h2>Guided quests — learn by doing</h2>
          <p>
            {getSiteStats().guidedQuests} interactive walkthroughs ship with the app. Each one clears the canvas,
            spotlights the right UI element, and advances when you complete the step — like a quest log in a
            game. Progress is saved per quest in your browser (no account).
          </p>

          <div className="guide-grid-2">
            {getQuestCatalog().map((q) => (
              <div className="guide-card" key={q.id}>
                <h3>{q.title}</h3>
                <p className="guide-example-flow">
                  {q.shortLabel} · {q.flow}
                </p>
                <p>{q.description}</p>
                <p className="guide-muted">
                  Start: welcome banner <strong>{q.shortLabel}</strong> or header <strong>Quests</strong>.
                </p>
              </div>
            ))}
          </div>

          <ul className="guide-rules">
            <li>
              <strong>Recommended order:</strong> Snack → Pipeline → Encoding → Parallel, then Writer&apos;s room →
              URL detective → Voice booth → Capture desk. Basics build wiring skills; advanced quests cover
              multi-agent chains, parse tools, TTS, and capture sinks.
            </li>
            <li>
              <strong>Skip anytime</strong> — every tooltip has <em>Skip quest</em>; your canvas stays as-is.
            </li>
            <li>
              <strong>Replay</strong> — header buttons restart the quest with a fresh canvas.
            </li>
            <li>
              <strong>Epilogue links</strong> — finish a quest to jump to this Guide or GitHub.
            </li>
          </ul>
        </section>

        <section id="interface" className="guide-section">
          <h2>The screen — four places to know</h2>
          <p>That is the whole map. You will not get lost.</p>
          <div className="guide-grid-2">
            <div className="guide-card">
              <h3>Left — building blocks</h3>
              <p>
                Drag <strong>Chat</strong>, <strong>Agent</strong>, and <strong>Tools</strong> onto the
                canvas. The palette lists <strong>{stats.totalTools} tools</strong> (plus Chat and Agent
                blocks) — use the <strong>search box</strong>{' '}
                at the top to find one by name (e.g. &ldquo;Base64&rdquo; or &ldquo;Slug&rdquo;). Browser
                tools are grouped into sub-sections: Output, Essentials, Text, Encoding &amp; Hash, JSON, Lists,
                Math, Date &amp; Time, Validate, and Flow. Cloud and Custom groups sit below. Badges show{' '}
                <code>free</code>, <code>locked</code>, <code>key ✓</code>, or{' '}
                <code>sandbox</code>. Cloud tools without a matching key appear <strong>locked</strong>{' '}
                (dashed border, 🔒) — you cannot drag them until you paste the key in{' '}
                <strong>Privacy &amp; keys</strong>. Unlocked cloud tools sort to the top of the Cloud group. The
                inspector explains what is missing and offers a <strong>Privacy &amp; keys</strong> button.
              </p>
            </div>
            <div className="guide-card">
              <h3>Center — your canvas</h3>
              <p>
                Drag the background to pan. Scroll to zoom. Click a block to select it — drag corners to
                resize (when unlocked). The <strong>lock</strong> icon on the toolbar freezes move, resize,
                delete, and wire changes; use the trash icon or press <kbd>Del</kbd> / <kbd>Backspace</kbd>{' '}
                on unlocked blocks. Drag from the small dot on the <em>right</em> of one block to the next.
              </p>
            </div>
            <div className="guide-card">
              <h3>Right — settings for the selected block</h3>
              <p>
                Click any block to open the inspector: rename it, see its type, or delete it (delete is
                disabled while the block is canvas-locked). Agents and Tools also show role, instructions,
                Tools also show role, instructions, URLs, speech language, port legend, and a{' '}
                <strong>Test</strong> button where applicable. Chat shows a read-only summary — edit
                messages directly on the canvas.
              </p>
            </div>
            <div className="guide-card">
              <h3>Bottom — activity log</h3>
              <p>
                A running diary of what the app is doing: which step ran, which AI was chosen, friendly
                warnings, and errors. Open any row&apos;s <strong>data</strong> button for technical
                details if you are curious.
              </p>
            </div>
          </div>
          <p className="guide-muted">
            Top bar: name your project, save/load, browse <strong>Examples</strong>, open the{' '}
            <strong>Quests</strong> menu for guided walkthroughs, add optional keys under{' '}
            <strong>Privacy &amp; keys</strong>, or return here with <strong>Guide</strong>.
          </p>
        </section>

        <section id="nodes" className="guide-section">
          <h2>Building blocks</h2>

          <div className="guide-node-block">
            <div className="guide-node-head">
              <span>💬</span>
              <h3>Chat — where you start</h3>
            </div>
            <p>
              Every workflow needs at least one Chat block. You type here; that message is what kicks
              everything off. A few past messages show above the input. Press <kbd>Enter</kbd> to
              send, <kbd>Shift + Enter</kbd> for a new line without sending.
            </p>
          </div>

          <div className="guide-node-block">
            <div className="guide-node-head">
              <span>🤖</span>
              <h3>Agent — the thinker</h3>
            </div>
            <p>
              An Agent sends text to an AI and gets a written answer back. It sees everything
              connected <em>before</em> it in the chain — your chat message, a file&apos;s contents, a
              scraped web page, and so on.
            </p>
            <ul>
              <li>
                <strong>Label</strong> — a nickname on the canvas (e.g. &ldquo;Homework helper&rdquo;)
              </li>
              <li>
                <strong>Role</strong> — short job title the AI sees (e.g. &ldquo;Patient tutor&rdquo;)
              </li>
              <li>
                <strong>System prompt</strong> — the real instructions: tone, rules, format. This is
                where you say &ldquo;answer in bullet points&rdquo; or &ldquo;never make things up.&rdquo;
              </li>
              <li>
                <strong>Brain</strong> — which AI engine to use (free on your PC vs optional cloud)
              </li>
              <li>
                <strong>Model</strong> — the specific AI variant. Smaller = faster on old laptops.
              </li>
            </ul>
          </div>

          <div className="guide-node-block">
            <div className="guide-node-head">
              <span>🛠️</span>
              <h3>Tools — hands for your workflow</h3>
            </div>
            <p>
              The palette lists <strong>{stats.totalTools} tools</strong> in three top-level groups. Most are
              single-purpose presets (trim, encode, hash, validate, …) — drag, connect, done.{' '}
              {stats.curatedModules} curated modules (ten browser essentials, four cloud APIs, Custom
              Script) have richer inspector panels. Full settings for curated tools are in{' '}
              <button type="button" className="guide-inline-link" onClick={() => scrollToSection('tools')}>
                Tools explained
              </button>{' '}
              below.
            </p>
            <ul>
              <li>
                <strong>Browser ({stats.browserTools})</strong> — Essentials plus Text, Encoding, JSON, Lists, Math,
                Date, Validate, Flow, Regex, Generate, HTML, Markdown, CSV, and Compare presets. No API key.
                Includes File Reader, Web Scraper, Speech, Parse URL, Fetch JSON, and many one-click utilities.
              </li>
              <li>
                <strong>Cloud ({stats.cloudTools})</strong> — Groq Transcribe, Gemini Vision, Gemini Embeddings,
                OpenRouter Embeddings. Add the matching key under <strong>Privacy &amp; keys</strong>.
              </li>
              <li>
                <strong>Custom ({stats.customTools})</strong> — Custom Script: your own short JavaScript in a sandboxed
                worker (no network).
              </li>
            </ul>
            <div className="guide-tool-list">
              <div>
                <strong>📄 File Reader</strong>
                <p>
                  Opens a file picker on your computer. The file is read locally — it does not get
                  uploaded to us or anywhere else. Perfect for notes, essays, CSVs, code files.
                </p>
              </div>
              <div>
                <strong>🌐 Web Scraper</strong>
                <p>
                  Grabs the readable text from a public web page (title + article body). Put a URL in
                  the tool settings, or type a domain in Chat earlier in the chain (e.g.{' '}
                  <code>wikipedia.org</code>).
                </p>
              </div>
              <div>
                <strong>🎤 Speech</strong>
                <p>
                  Uses your browser&apos;s built-in voice features: listen (speech-to-text), speak aloud
                  (text-to-speech), or both. Chrome and Edge work best. Listen mode needs microphone
                  permission.
                </p>
              </div>
            </div>
            <p className="guide-muted">
              The other browser utilities (text, JSON, dates, math, clipboard) and cloud tools are
              documented in the{' '}
              <button type="button" className="guide-inline-link" onClick={() => scrollToSection('tools')}>
                Tools explained
              </button>{' '}
              section — click any tool on the canvas to configure it in the inspector.
            </p>
          </div>
        </section>

        <section id="wiring" className="guide-section">
          <h2>Connecting blocks</h2>
          <p>
            Information flows <strong>left to right</strong> along the lines you draw — like reading a
            comic panel by panel. Each block shows <strong>typed ports</strong>: small colored dots with
            labels. Drag from an <em>output</em> port to a compatible <em>input</em> port.
          </p>
          <div className="guide-flow-diagram" aria-hidden="true">
            <span className="guide-flow-node">💬 Chat</span>
            <span className="guide-flow-arrow">→</span>
            <span className="guide-flow-node">🌐 Web page</span>
            <span className="guide-flow-arrow">→</span>
            <span className="guide-flow-node">🤖 Agent</span>
          </div>
          <h3>Port types</h3>
          <ul className="guide-rules">
            <li>
              <strong>Text</strong> (default) — chat messages, scraped pages, transformed strings.
              Chat outputs on <code>Message</code>; Agents accept <code>Context</code> (multiple wires
              OK) and output <code>Out</code>.
            </li>
            <li>
              <strong>JSON</strong> — structured data. Manifest tools like <strong>JSON Pretty</strong>{' '}
              use JSON inputs — connect JSON → Text freely, but not raw Chat text. The curated{' '}
              <strong>JSON Tool</strong> (Essentials) accepts <em>text</em> so you can paste JSON in Chat
              and wire <code>Message → In</code> directly.
            </li>
            <li>
              <strong>Number / Boolean / Binary / Embedding</strong> — reserved for specialized cloud
              tools; only connect matching types.
            </li>
          </ul>
          <p>
            While dragging a wire, compatible ports <strong>highlight</strong>; mismatched types cannot
            connect. A plain-English reason appears in the <strong>Activity log</strong> (e.g. wrong port
            type, duplicate input, or Chat wired as a target). Legacy saved workflows auto-migrate to
            default handles (<code>message</code>, <code>context</code>, <code>in</code>, <code>out</code>).
          </p>
          <div className="guide-callout guide-callout--tip">
            <strong>Pipeline quest tip:</strong> one step asks you to try an invalid wire on purpose —
            watch the Activity log, then connect <strong>Message → In</strong> on each block in order.
          </div>
          <ul className="guide-rules">
            <li>
              Drag from an <strong>output</strong> dot on one block to an <strong>input</strong> dot on
              the next.
            </li>
            <li>One block can split into several (e.g. Chat → two different Agents).</li>
            <li>
              Several blocks can feed one Agent&apos;s <code>Context</code> port in <strong>parallel</strong>{' '}
              — each becomes a labeled section (User message, Date &amp; Time, etc.) plus structured JSON
              for the model. Tools like <strong>Date &amp; Time</strong> can <strong>auto-run</strong> without
              upstream input when configured (e.g. Format now).
            </li>
            <li>
              <strong>Chat is optional.</strong> Tool-only workflows use <strong>Run workflow</strong> on the
              Agent inspector. When Chat is present, your typed message is always sent to Agents — even in
              serial chains like Chat → Tool → Agent.
            </li>
            <li>
              <strong>Post-agent chains.</strong> Wire <code>Agent Out</code> → <code>Tool In</code> → … to
              transform or speak the reply (e.g. Base64 encode → Speech TTS). Tools after the Agent run once
              the Agent finishes.
            </li>
            <li>
              <strong>No loops.</strong> If you wire A → B → A in a circle, the app will stop and ask
              you to remove the loop. Flow must go one way.
            </li>
            <li>
              <strong>Chat cannot be a target.</strong> It only sends — never receives wires.
            </li>
            <li>
              Blocks left floating alone still sit on the canvas but might not get any input — fine
              for doodling, confusing for real workflows.
            </li>
          </ul>
        </section>

        <section id="running" className="guide-section">
          <h2>When you press send (or Run on an Agent)</h2>
          <p>Here is what happens behind the scenes — in plain English:</p>
          <ol className="guide-steps guide-steps--compact">
            <li>
              <span className="guide-step-num">1</span>
              <div>
                The orchestrator finds all blocks <strong>upstream and downstream</strong> of the target
                Agent(s) — tools wired to Context <em>before</em> the Agent, plus any chain after{' '}
                <code>Agent Out</code> (e.g. transform → Speech).
              </div>
            </li>
            <li>
              <span className="guide-step-num">2</span>
              <div>
                Each block runs in topological order. Tools with <strong>auto-run</strong> can execute
                without upstream input (e.g. Date &amp; Time Format now).
              </div>
            </li>
            <li>
              <span className="guide-step-num">3</span>
              <div>
                The Agent receives <strong>labeled context blocks</strong> — your Chat message (always, when
                you send) plus each wired tool output as structured JSON.
              </div>
            </li>
            <li>
              <span className="guide-step-num">4</span>
              <div>
                The Agent reply appears in Chat (when present) or in the Agent&apos;s last output — even when
                a post-agent <strong>Speech</strong> block speaks it aloud (TTS plays in the background).
                Load ready-made flows from header <strong>Examples</strong> (try <strong>Wiki to podcast</strong>).
              </div>
            </li>
            <li>
              <span className="guide-step-num">5</span>
              <div>
                Any tools wired <strong>after</strong> the Agent (<code>Out</code> → <code>In</code>) run next
                in order — encode, prefix, speak, or more transforms on the Agent&apos;s text.
              </div>
            </li>
          </ol>
          <div className="guide-callout guide-callout--warn">
            <strong>Cloud path?</strong> If your workflow includes a cloud Agent or cloud tool{' '}
            <em>and</em> you saved the matching API key, Chat shows a yellow banner before send —
            your message and anything wired upstream (files, web pages, audio) may leave the browser.
            Open <strong>Privacy &amp; keys → Privacy &amp; cloud providers</strong> for official per-vendor settings.
          </div>
          <div className="guide-callout guide-callout--warn">
            <strong>While a run is active</strong>, Save / Load / New are paused. If it feels stuck,
            peek at the activity log — a model download on slow internet can take several minutes.
          </div>
        </section>

        <section id="text-output" className="guide-section">
          <h2>Text Output — results without Chat</h2>
          <p>
            <strong>Text Output</strong> lives at the top of Browser tools under <strong>Output</strong>.
            Wire any upstream block to its <code>In</code> port — each run appends a timestamped entry you can
            scroll, copy, or clear. History is saved with your workflow (Save / Export).
          </p>
          <ul>
            <li>
              <strong>Run from the canvas</strong> — eligible starters show <strong>Run workflow</strong> above
              the block (Agents, Date & Time, generators, scraper with URL, Text Output for capture-only chains).
            </li>
            <li>
              <strong>No Chat?</strong> Select Text Output and click <strong>Run capture</strong> — only
              <strong> tool</strong> blocks upstream run (Scraper → HTML → Text Output). If Chat or Agent is in
              the chain, send from Chat instead.
            </li>
            <li>
              <strong>After an Agent?</strong> <code>Agent Out → Text Output</code> keeps a running log while
              Chat still shows only the Agent reply.
            </li>
            <li>
              Try header <strong>Examples → Silent scraper</strong> for a scraper pipeline without Chat or Agent.
            </li>
          </ul>
          <h3>Post-agent chains — what works</h3>
          <table className="guide-table">
            <thead>
              <tr>
                <th>Tool type</th>
                <th>After Agent Out</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Text transforms (Trim, Base64, Add Prefix, HTML…)</td>
                <td>Works</td>
              </tr>
              <tr>
                <td>Text Output, Clipboard write, Speech TTS</td>
                <td>Works — good sinks</td>
              </tr>
              <tr>
                <td>JSON Pretty / strict JSON tools</td>
                <td>Won&apos;t connect — Agent outputs text, not JSON</td>
              </tr>
              <tr>
                <td>Embeddings</td>
                <td>Downstream text tools won&apos;t connect — output is embedding type</td>
              </tr>
              <tr>
                <td>File Reader, Speech listen</td>
                <td>Runs but odd UX — opens picker or mic instead of using Agent text</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section id="brains" className="guide-section">
          <h2>Choosing an AI (&ldquo;brain&rdquo;)</h2>
          <div className="guide-callout guide-callout--tip">
            <strong>Recommended setup:</strong> Get a free key at{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
              openrouter.ai/keys
            </a>{' '}
            and pick <strong>Auto (rotate free models)</strong> in the agent inspector. The app
            switches models when one hits a rate limit or disappears — no manual babysitting.
          </div>
          <p>
            In the right panel, each Agent has an <strong>AI engine</strong> dropdown — that is simply{' '}
            <em>which service generates the text</em>. We label costs honestly:
          </p>
          <table className="guide-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Cost</th>
                <th>Good when…</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>OpenRouter</strong>
                </td>
                <td>
                  <span className="guide-tag guide-tag--cyan">free models</span>
                </td>
                <td>
                  <strong>Best choice.</strong> Free key + auto-rotation across :free models. Fast,
                  smart, and self-healing when quotas bite.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Transformers.js</strong>
                </td>
                <td>
                  <span className="guide-tag guide-tag--green">free</span>
                </td>
                <td>
                  Offline / no signup. First use downloads a small model — can be slow on old hardware.
                  Pick the smallest model if sluggish.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>WebLLM</strong>
                </td>
                <td>
                  <span className="guide-tag guide-tag--green">free</span>
                </td>
                <td>
                  <strong>Slow local fallback only.</strong> Large download, needs WebGPU. Not
                  recommended unless you cannot use OpenRouter.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Groq / Gemini</strong>
                </td>
                <td>
                  <span className="guide-tag guide-tag--purple">Free tier</span>
                </td>
                <td>
                  Snappy cloud with a free key. Auto-rotates models on rate limits.
                </td>
              </tr>
            </tbody>
          </table>
          <div className="guide-callout guide-callout--tip">
            <strong>Intelligent setup.</strong> Engines and cloud tools you cannot run yet are{' '}
            <strong>locked in the UI</strong> — not hidden, so you always see what exists. Paste the
            matching free key in <strong>Privacy &amp; keys</strong> (or enable WebGPU for WebLLM) and they unlock
            instantly. At run time, if you somehow picked a cloud brain without a key, the app still
            falls back to free local Transformers.js and logs a yellow note in the activity log.
          </div>
          <p>
            Optional keys live under <strong>Privacy &amp; keys</strong> in the header. Scroll to{' '}
            <strong>Privacy &amp; cloud providers</strong> for an honest per-provider checklist (what
            leaves your browser, risks, official settings links). By default keys are
            <strong> forgotten when you close the browser</strong> — like logging out on a shared
            PC. Choose <strong>Remember on this device</strong> only on a computer that is truly
            yours. Sign-up links in that panel all offer free tiers.
          </p>
        </section>

        <section id="tools" className="guide-section">
          <h2>Tools explained</h2>

          <h3>File Reader</h3>
          <p>
            When the workflow reaches this step, your operating system&apos;s file picker opens.
            Works with common text formats: <code>.txt</code>, <code>.md</code>, <code>.json</code>,{' '}
            <code>.csv</code>, and more. If you cancel the picker, that step fails (and is logged).
          </p>

          <h3>Web Scraper</h3>
          <p>
            You choose the URL — the app does not decide what is allowed. <strong>Check the site&apos;s
            Terms of Service and robots.txt before scraping.</strong> Many sites forbid bots; login walls
            and paywalls mean you should not fetch that page. If you see <strong>403 Forbidden</strong>,
            stop — that is the site refusing automated access, not a puzzle to bypass.
          </p>
          <p>
            Technically: Wikipedia uses the public API; other pages may go through your browser, then
            optional public CORS helper services if needed — <strong>those helpers can see the URL you
            requested</strong>. Local/private addresses (localhost, home routers) are blocked. You get
            title and main text; huge pages are trimmed.
          </p>
          <p>
            Where does the URL come from? (1) Text from earlier blocks, (2) default URL in the tool
            settings, (3) error if neither exists. Scraped text is untrusted — be careful wiring it
            straight into a cloud Agent with sensitive keys.
          </p>
          <p>
            Each Web Scraper block shows a <strong>safety notice</strong> in the inspector with the
            full checklist. Maintainer docs:{' '}
            <a
              href="https://github.com/sakurablush/brainwire/blob/main/docs/TOOL-SAFETY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tool safety guide
            </a>
            .
          </p>

          <h3>Speech</h3>
          <p>
            <strong>Listen</strong> — microphone → text. <strong>Speak</strong> — reads earlier text
            aloud. <strong>Both</strong> — listen, then speak the result. Set language in the tool
            settings (default <code>en-US</code>). Works best in Chrome or Edge.
          </p>

          <h3>Browser utilities</h3>
          <p>
            Beyond the curated <strong>Text Transform</strong>, <strong>JSON Tool</strong>,{' '}
            <strong>Date &amp; Time</strong>, and <strong>Calculator</strong> blocks, the palette offers
            dozens of presets: trim/upper/slugify, Base64 and URL encoding, SHA hashes, JSON
            pretty/minify/get-path, line split/dedupe/sort, math round/min/max, date diff, validators
            (is JSON, is URL, is email), and flow helpers (template, default-if-empty). Search the
            sidebar to find them — most need no extra config.
          </p>
          <div className="guide-callout guide-callout--tip">
            <strong>JSON Tool vs JSON Pretty:</strong> the curated <strong>JSON Tool</strong> (Essentials)
            accepts text from Chat — paste JSON and wire <code>Message → In</code>. Manifest presets like{' '}
            <strong>JSON Pretty</strong> require a JSON-typed upstream port; use JSON Tool first or chain
            through another JSON block.
          </div>
          <p>
            <strong>Text Transform</strong> — trim, change case, split on a separator, regex extract,
            find/replace, or slice a substring. <strong>JSON Tool</strong> — pretty-print, minify, or
            pull a field by dot path (e.g. <code>user.name</code>). <strong>Date &amp; Time</strong> —
            format the current time or parse ISO dates. <strong>Calculator</strong> — safe math on
            upstream numbers (digits and <code>+ - * / ( ) . %</code> only — evaluated in a strict
            sandbox, not a full expression language; no variables or words). <strong>Clipboard</strong>{' '}
            — read or write the system clipboard when you explicitly run the step (your browser may ask
            permission).
          </p>

          <h3>Cloud tools (optional keys)</h3>
          <p>
            These talk directly from your browser to the provider — add keys under <strong>Privacy &amp; keys</strong>{' '}
            in the header. Without a key, the step fails with a clear message in the activity log.
          </p>
          <ul>
            <li>
              <strong>Groq Transcribe</strong> — pick an audio file when the step runs; uses Whisper
              (<code>whisper-large-v3-turbo</code>). Max ~25&nbsp;MB.
            </li>
            <li>
              <strong>Gemini Vision</strong> — pick an image; upstream text is your question about the
              image. Uses <code>gemini-2.0-flash</code>.
            </li>
            <li>
              <strong>Gemini Embeddings</strong> / <strong>OpenRouter Embeddings</strong> — embed text
              or compare cosine similarity to a reference string you set in the tool inspector.
            </li>
          </ul>

          <h3>Custom Script</h3>
          <p>
            Write a short JavaScript snippet in the inspector. It runs in an isolated{' '}
            <strong>Web Worker</strong> on your device — no network, no access to the page DOM. You get{' '}
            <code>input</code> (upstream text), <code>config</code> (tool settings), and{' '}
            <code>helpers</code> (<code>jsonParse</code>, <code>jsonStringify</code>, <code>trim</code>,{' '}
            <code>regex</code>). Use <code>return …</code> to pass a string to the next block. Scripts are
            capped at 8&nbsp;KB and time out after 8 seconds. The Pipeline quest walks through a minimal
            example.
          </p>
          <div className="guide-callout guide-callout--warn">
            <strong>Safety:</strong> Custom Script runs in an isolated worker (no DOM). Network is
            blocked — do not paste API keys or secrets into scripts; they are stored in your workflow
            JSON when you save.
          </div>
        </section>

        <section id="staying-safe" className="guide-section">
          <h2>Staying safe</h2>
          <p>
            Brainwire runs in <strong>your</strong> browser. We do not host your files, keys, or
            workflows on a central server — but some blocks still need care.
          </p>
          <div className="guide-callout guide-callout--warn">
            <strong>Inspector safety notices.</strong> Select any tool block on the canvas. When a tool
            can fetch the web, read the clipboard, use the microphone, call a cloud API, or run your
            code, a colored notice appears at the top of the settings panel — plain English, no jargon.
          </div>
          <h3>Quick rules</h3>
          <ul>
            <li>
              <strong>Web Scraper</strong> — Only pages you are allowed to access. Respect ToS,
              robots.txt, and 403 responses.
            </li>
            <li>
              <strong>File Reader / Speech / Clipboard</strong> — Fine on-device; if wired to a cloud
              Agent, content may leave your browser.
            </li>
            <li>
              <strong>Cloud tools</strong> (Groq, Gemini, OpenRouter) — Your key, your data, their
              privacy policy. Read <strong>Privacy &amp; keys → Privacy &amp; cloud providers</strong> before
              sending sensitive text.
            </li>
            <li>
              <strong>Custom Script</strong> — Sandboxed (no network), but never paste API keys into
              scripts.
            </li>
            <li>
              <strong>Privacy &amp; keys</strong> — Default is forget on browser close. Clear keys on shared
              PCs.
            </li>
            <li>
              <strong>Export</strong> — Downloads workflow JSON, not Settings keys. Accidental keys in
              config are redacted on export — still avoid storing secrets in blocks.
            </li>
            <li>
              <strong>Locked tools &amp; engines</strong> — Cloud items without your key cannot be
              dragged from the palette; cloud engines show <strong>Setup required</strong> in the
              inspector. This is intentional — we teach what is missing instead of failing silently.
            </li>
          </ul>
          <p>
            Full per-tool reference:{' '}
            <a
              href="https://github.com/sakurablush/brainwire/blob/main/docs/TOOL-SAFETY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/TOOL-SAFETY.md
            </a>
            . Security model &amp; vulnerability reporting:{' '}
            <a
              href="https://github.com/sakurablush/brainwire/blob/main/docs/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/SECURITY.md
            </a>
            .
          </p>
        </section>

        <section id="privacy" className="guide-section">
          <h2>Privacy &amp; trust — no token games</h2>
          <p>
            Brainwire is <strong>static open-source code</strong> served from GitHub Pages (or
            your own fork). We are not trying to resell AI credits or harvest your prompts.
          </p>
          <div className="guide-callout guide-callout--tip">
            <strong>What we do NOT do:</strong> no account system, no analytics SDK, no central server
            that receives your chats, files, or API keys. We cannot see what you type — and we designed
            it that way on purpose.
          </div>
          <h3>What can leave your browser</h3>
          <ul>
            <li>
              <strong>Cloud AI</strong> (OpenRouter, Groq, Gemini) — only if you paste a key and run a
              cloud Agent or cloud tool. Your browser talks <em>directly</em> to that company.
            </li>
            <li>
              <strong>Web Scraper</strong> — URLs you choose; optional third-party CORS helpers may see
              the URL.
            </li>
            <li>
              <strong>Local model download</strong> — first run pulls public weights from Hugging Face /
              MLC CDNs. Inference then stays on-device for Transformers.js / WebLLM.
            </li>
          </ul>
          <h3>Read before you send secrets</h3>
          <p>
            Open <strong>Privacy &amp; keys → Privacy &amp; cloud providers</strong> in the app. Each vendor has an
            honest checklist: what we send, risks in plain language, and links to <em>their</em> privacy
            settings. Free Gemini / AI Studio keys are often &ldquo;Unpaid Services&rdquo; — Google may use
            prompts to improve products unless you are on paid terms. <strong>Trust their docs if ours
            disagrees.</strong>
          </p>
          <p>
            Maintainer references:{' '}
            <a
              href="https://github.com/sakurablush/brainwire/blob/main/docs/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/SECURITY.md
            </a>
            {' · '}
            <a
              href="https://github.com/sakurablush/brainwire/blob/main/docs/TOOL-SAFETY.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/TOOL-SAFETY.md
            </a>
          </p>
        </section>

        <section id="examples" className="guide-section">
          <h2>Ideas to try</h2>
          <p>
            Header <strong>Examples</strong> loads {getSiteStats().exampleWorkflows} pre-wired canvases in
            one click — great when you want to explore before building from scratch.
          </p>
          <div className="guide-grid-2">
            {exampleWorkflows.map((example) => (
              <div key={example.id} className="guide-card">
                <h3>
                  {example.name}
                  {example.featured ? ' ★' : ''}
                  {getExampleKeyBadgeLabel(example.requiresKey) ? (
                    <span className="guide-example-badge">
                      {getExampleKeyBadgeLabel(example.requiresKey)}
                    </span>
                  ) : null}
                </h3>
                <p className="guide-example-flow">
                  {EXAMPLE_CATEGORY_LABELS[example.category]} · {example.flow}
                </p>
                <p>{example.description}</p>
                {example.tryPrompt ? (
                  <p className="guide-muted guide-example-try">
                    Try prompt pre-filled: &ldquo;{example.tryPrompt.slice(0, 72)}
                    {example.tryPrompt.length > 72 ? '…' : ''}&rdquo;
                  </p>
                ) : null}
                <p className="guide-muted">Header → Examples → {example.name}</p>
              </div>
            ))}
          </div>
          <h3 className="guide-subheading">More ways to learn</h3>
          <p className="guide-muted">
            Prefer step-by-step? Use guided quests. Want to remix? Load an example from the header, then edit
            blocks on the canvas.
          </p>
          <div className="guide-examples">
            <div className="guide-card">
              <h3>Snack Investigator walkthrough</h3>
              <p className="guide-example-flow">Header → Quests → Snack Investigator</p>
              <p>
                Guided tour for <strong>Chat → Web Scraper → Agent</strong> — or load the{' '}
                <strong>Snack verdict</strong> example for the same flow in one click.
              </p>
            </div>
            <div className="guide-card">
              <h3>Pipeline Apprentice walkthrough</h3>
              <p className="guide-example-flow">Header → Quests → Pipeline Apprentice</p>
              <p>
                In-app walkthrough for <strong>Chat → JSON Tool → Custom Script → Agent</strong>. One-click
                version: <strong>Script laboratory</strong> in Examples.
              </p>
            </div>
            <div className="guide-card">
              <h3>Encoding Chain walkthrough</h3>
              <p className="guide-example-flow">Header → Quests → Encoding Chain</p>
              <p>
                Short quest for Base64 encode/decode — or load <strong>Encode boomerang</strong> from Examples.
              </p>
            </div>
            <div className="guide-card">
              <h3>Parallel Context walkthrough</h3>
              <p className="guide-example-flow">Header → Quests → Parallel Context</p>
              <p>
                Learn parallel context ports — then try <strong>Context briefing</strong> or{' '}
                <strong>Research party</strong> in Examples.
              </p>
            </div>
          </div>
        </section>

        <section id="debug" className="guide-section">
          <h2>Activity log</h2>
          <p>
            The panel at the bottom is your workflow&apos;s diary — not scary developer stuff unless
            you want it to be. Colors mean:
          </p>
          <ul>
            <li>
              <span className="guide-log guide-log--info">info</span> — normal steps (&ldquo;calling
              AI&rdquo;, &ldquo;tool started&rdquo;)
            </li>
            <li>
              <span className="guide-log guide-log--thought">thought</span> — preview of what the
              agent is working with
            </li>
            <li>
              <span className="guide-log guide-log--warn">warn</span> — heads-up (switched to free
              local AI, missing key, <strong>rejected canvas connection</strong>)
            </li>
            <li>
              <span className="guide-log guide-log--error">error</span> — something failed at that
              step
            </li>
            <li>
              <span className="guide-log guide-log--success">success</span> — step finished OK
            </li>
          </ul>
          <p>
            Tap <strong>data</strong> on a line to see extra technical details — handy if you are
            debugging which model or URL was used.
          </p>
        </section>

        <section id="save" className="guide-section">
          <h2>Saving your work</h2>
          <p>
            Projects are stored in <strong>your browser&apos;s built-in database</strong> — the same
            kind of storage websites use for offline apps. Nothing is uploaded to us. No login.
          </p>
          <ul>
            <li>
              <strong>Save</strong> — remembers your blocks, lines, project name, and canvas-lock flags in the browser. A
              dot beside the name means unsaved changes.
            </li>
            <li>
              <strong>Load</strong> — open something you saved before (you will be asked to confirm if
              the current canvas has work on it).
            </li>
            <li>
              <strong>Export</strong> — download the current canvas as a <code>.brainwire.json</code>{' '}
              file (share, backup, or open in another browser).
            </li>
            <li>
              <strong>Import</strong> — load a <code>.brainwire.json</code> file from disk. Invalid files
              show a clear error; valid imports ask before replacing your canvas.
            </li>
            <li>
              <strong>New</strong> — blank canvas. Save or export first if you care about the current one!
            </li>
          </ul>
          <div className="guide-callout guide-callout--warn">
            <strong>Heads-up:</strong> clearing browser data deletes saved workflows. Use{' '}
            <strong>Export</strong> for backups you can keep outside the browser.
          </div>
        </section>

        <section id="tips" className="guide-section">
          <h2>When something breaks</h2>
          <div className="guide-faq-grid">
            <div className="guide-card">
              <h3>Download seems stuck?</h3>
              <p>
                Give it a few minutes on slow Wi‑Fi. Refresh, try again, or pick the smallest model in
                the Agent settings.
              </p>
            </div>
            <div className="guide-card">
              <h3>&ldquo;WebGPU not available&rdquo;?</h3>
              <p>
                Your device cannot use the faster local path. Switch the Agent to Transformers.js — it
                works on almost any PC. Privacy &amp; keys shows your status.
              </p>
            </div>
            <div className="guide-card">
              <h3>Web page tool returns nothing?</h3>
              <p>
                Some sites block reading. Try a simpler public page, or paste the text with File Reader
                instead.
              </p>
            </div>
            <div className="guide-card">
              <h3>Payment / 402 error?</h3>
              <p>
                On OpenRouter you probably hit a paid model. Pick one ending in <code>:free</code>, or
                use a local brain for free.
              </p>
            </div>
            <div className="guide-card">
              <h3>&ldquo;Cycle&rdquo; or loop error?</h3>
              <p>
                You wired blocks in a circle. Remove one line so flow goes one direction only — no
                round trips.
              </p>
            </div>
            <div className="guide-card">
              <h3>Cloud tool is &ldquo;locked&rdquo;?</h3>
              <p>
                Open <strong>Privacy &amp; keys</strong> in the header and add a Groq, Gemini, or OpenRouter key (free
                tiers exist). Locked palette items cannot be dragged until the key is saved — the
                inspector shows <strong>Setup required</strong> with a <strong>Privacy &amp; keys</strong> button.
              </p>
            </div>
            <div className="guide-card">
              <h3>Cannot connect two ports?</h3>
              <p>
                Check port types in the inspector <strong>Ports</strong> legend — text, json, number, etc.
                Wire output → input on compatible types. Chat only sends (<code>Message</code> out).
                Read the yellow <strong>warn</strong> line in the Activity log for the exact reason.
              </p>
            </div>
            <div className="guide-card">
              <h3>Laptop fan screaming?</h3>
              <p>
                AI is heavy. Use smaller models, shorter instructions, fewer Agents in one chain.
              </p>
            </div>
          </div>
        </section>

        <section id="opensource" className="guide-section">
          <h2>Open source &amp; support</h2>
          <p className="guide-lead">
            Brainwire is free software. Fork it, host your own copy, or send improvements back.
          </p>
          <div className="guide-card-grid">
            <div className="guide-card">
              <h3>Source code</h3>
              <p>
                <a
                  href="https://github.com/sakurablush/brainwire"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/sakurablush/brainwire
                </a>{' '}
                — MIT license. No npm package; deploy the static <code>dist/</code> folder to GitHub
                Pages or any host.
              </p>
            </div>
            <div className="guide-card">
              <h3>Documentation</h3>
              <p>
                This Guide is the user manual. Maintainers also publish{' '}
                <a
                  href="https://github.com/sakurablush/brainwire/blob/main/docs/ARCHITECTURE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  architecture
                </a>
                ,{' '}
                <a
                  href="https://github.com/sakurablush/brainwire/blob/main/docs/DEPLOYMENT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  deployment
                </a>
                ,{' '}
                <a
                  href="https://github.com/sakurablush/brainwire/blob/main/docs/TOOL-SAFETY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  tool safety
                </a>
                ,{' '}
                <a
                  href="https://github.com/sakurablush/brainwire/blob/main/docs/SECURITY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  security
                </a>
                , and{' '}
                <a
                  href="https://github.com/sakurablush/brainwire/blob/main/docs/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  contributing
                </a>{' '}
                guides in the repo.
              </p>
            </div>
            <div className="guide-card">
              <h3>Report bugs &amp; contribute</h3>
              <p>
                Use GitHub{' '}
                <a
                  href="https://github.com/sakurablush/brainwire/issues/new/choose"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  issue templates
                </a>{' '}
                for bugs and feature ideas. Pull requests welcome — run <code>npm run ci</code>{' '}
                locally first.
              </p>
            </div>
            <div className="guide-card guide-card--wide">
              <h3>Support the project</h3>
              <p>
                Brainwire is free — no paywall, no accounts, no ads. If it saved you time or
                money and you want to help cover the next round of building, you can chip in via
                crypto (optional). The app stays free either way.
              </p>
              <SponsorCryptoTable />
            </div>
          </div>
        </section>

        <section id="faq" className="guide-section guide-section--last">
          <h2>FAQ</h2>
          <dl className="guide-dl">
            <dt>Do I have to pay?</dt>
            <dd>
              No. Local AI is free forever. Cloud keys are optional — you only spend money if you
              deliberately choose paid models on those platforms.
            </dd>
            <dt>Do you see my chats or files?</dt>
            <dd>
              No. We do not run servers for your data — there is no analytics endpoint in this app.
              Local AI stays on your device. Cloud AI talks directly from your browser to the provider
              whose key you added; we are not in the middle.
            </dd>
            <dt>Are you trying to sell me tokens or steal my key?</dt>
            <dd>
              No. We have no billing, no proxy, and no way to charge your API account. Keys live in{' '}
              <em>your</em> browser storage and are sent only to the vendor you chose. We recommend free
              tiers because they help students — not because we earn a cut (we do not).
            </dd>
            <dt>What does &ldquo;locked&rdquo; mean in the palette?</dt>
            <dd>
              That tool needs something you have not set up yet — usually a free API key in{' '}
              <strong>Privacy &amp; keys</strong>, or a browser feature (e.g. speech on Chrome/Edge). Locked items stay
              visible so you know what exists; the inspector explains how to unlock them.
            </dd>
            <dt>Where do my API keys live?</dt>
            <dd>
              Only in your browser. The default is <strong>session storage</strong> — keys are AES-GCM
              encrypted and disappear when you close the tab or browser (great for shared computers). You can switch to{' '}
              <strong>Remember on this device</strong> in Privacy &amp; keys if this laptop is only yours.
              Exported workflows never include your keys.
            </dd>
            <dt>Does it work offline?</dt>
            <dd>
              After the first model download, local AI can work without internet. Web and cloud
              features still need a connection.
            </dd>
            <dt>Which browser?</dt>
            <dd>
              Recent Chrome, Edge, or Firefox. Voice and the faster local AI path work best on
              Chromium (Chrome/Edge).
            </dd>
            <dt>How many tools are there?</dt>
            <dd>
              <strong>{stats.totalTools}</strong> in the palette — search at the top, then browse Browser sub-groups
              (Essentials, Text, Encoding, JSON, Lists, Math, Date, Validate, Flow, Regex, Generate, HTML, Markdown,
              CSV, Compare), four cloud tools, and Custom Script. {stats.curatedModules} curated modules with rich
              inspectors plus {stats.manifestPresets} one-click manifest presets.
            </dd>
            <dt>What are the guided quests?</dt>
            <dd>
              <strong>{stats.guidedQuests} walkthroughs</strong> — basics: Snack Investigator, Pipeline Apprentice,
              Encoding Chain, Parallel Context; advanced: Writer&apos;s room, URL detective, Voice booth, Capture desk.
              All replayable from the header <strong>Quests</strong> menu; see{' '}
              <button type="button" className="guide-inline-link" onClick={() => scrollToSection('quests')}>
                Guided quests
              </button>{' '}
              above for flows and order.
            </dd>
            <dt>What does the lock icon on a selected block do?</dt>
            <dd>
              That is <strong>canvas lock</strong> — it prevents accidental moves, resizes, deletes, and wire
              changes. It is separate from palette <strong>setup lock</strong> (missing API key). Unlock from the
              toolbar before editing the block again; the flag is saved with your workflow.
            </dd>
            <dt>I am a developer — where is the code?</dt>
            <dd>
              Open source at{' '}
              <a
                href="https://github.com/sakurablush/brainwire"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/sakurablush/brainwire
              </a>
              . Run <code>npm run dev</code> locally or host <code>dist/</code> on GitHub Pages — see{' '}
              <button type="button" className="guide-inline-link" onClick={() => scrollToSection('opensource')}>
                Open source &amp; support
              </button>{' '}
              above.
            </dd>
          </dl>
          <div className="guide-footer-cta">
            <p>That is the whole manual. Go make something.</p>
            <button type="button" className="guide-cta-btn" onClick={() => navigateTo('studio')}>
              Open Studio →
            </button>
          </div>
        </section>
      </article>
    </div>
  )
}
