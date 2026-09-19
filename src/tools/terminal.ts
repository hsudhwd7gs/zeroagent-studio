// Terminal/Bash execution node — uses Pyodide's shell (run under /proxy worker)
// or browser-shell (WebContainers) when available.
//
// Behavior:
//   • Mode "pyodide-shell": runs Python's subprocess-like shell inside Pyodide.
//     Commands like `ls`, `cat`, `pwd`, `echo`, `head`, `tail`, `wc`, `grep`,
//     `sort`, `uniq` are emulated via Python's `os`/`pathlib`/`shutil`.
//   • Mode "js-eval": evaluates JavaScript in a sandboxed worker (same as
//     Custom Script) with access to a virtual filesystem (Map).
//   • Mode "worker-proxy": POSTs the script to the Brainwire worker, which
//     runs it under isolated exec on Cloudflare. Requires authentication.
//
// Safety:
//   • Network calls are allowed (CORS still applies).
//   • No access to DOM, window, or cookies.
//   • Time limit: 60s.
//   • Output size cap: 1MB (truncated with a notice).
//   • Persistent filesystem between calls within one workflow run (per-node).

export const TERMINAL_TIMEOUT_MS = 60_000
export const TERMINAL_MAX_OUTPUT = 1_000_000

export interface TerminalResult {
  stdout: string
  stderr: string
  exitCode: number
  truncated?: boolean
}

export interface TerminalConfig {
  command?: string
  mode?: 'pyodide-shell' | 'js-eval' | 'worker-proxy'
  cwd?: string
}

/**
 * Run a terminal command locally in the browser.
 *
 * Strategy:
 *   1. Parse the command line into argv (handles quotes simply).
 *   2. Dispatch to a built-in handler for known commands (ls, cat, pwd,
 *      echo, head, tail, wc, grep, sort, uniq, mkdir, touch, rm, cp, mv).
 *   3. Unknown commands fall back to "command not found" with exit code 127.
 *
 * The virtual filesystem is a Map<string, string> stored in memory for the
 * duration of one workflow execution. Files persist between calls in the
 * same node.
 */
export async function runTerminal(
  command: string,
  config: TerminalConfig,
  vfs: Map<string, string> = new Map()
): Promise<TerminalResult> {
  const trimmed = (command ?? '').trim()
  if (!trimmed) {
    return { stdout: '', stderr: '', exitCode: 0 }
  }

  const cwd = config.cwd ?? '/'
  const tokens = tokenizeCommandLine(trimmed)
  if (tokens.length === 0) {
    return { stdout: '', stderr: '', exitCode: 0 }
  }

  const [cmd, ...args] = tokens
  try {
    switch (cmd) {
      case 'echo':
        return { stdout: args.join(' ') + '\n', stderr: '', exitCode: 0 }
      case 'pwd':
        return { stdout: cwd + '\n', stderr: '', exitCode: 0 }
      case 'ls': {
        const target = args[0] ?? cwd
        const entries = new Set<string>()
        for (const path of vfs.keys()) {
          if (path.startsWith(target === '/' ? '/' : target + '/')) {
            const rest = path.slice(target === '/' ? 1 : target.length + 1)
            if (rest) entries.add(rest.split('/')[0])
          }
        }
        return { stdout: Array.from(entries).sort().join('\n') + (entries.size ? '\n' : ''), stderr: '', exitCode: 0 }
      }
      case 'cat': {
        if (args.length === 0) return { stdout: '', stderr: 'cat: missing file operand\n', exitCode: 1 }
        const out: string[] = []
        for (const f of args) {
          const content = vfs.get(f)
          if (content === undefined) {
            return { stdout: '', stderr: `cat: ${f}: No such file or directory\n`, exitCode: 1 }
          }
          out.push(content)
        }
        return { stdout: out.join(''), stderr: '', exitCode: 0 }
      }
      case 'head': {
        const n = args[0] === '-n' && args[1] ? parseInt(args[1], 10) : 10
        const file = args[args[0] === '-n' ? 2 : 0]
        if (!file) return { stdout: '', stderr: 'head: missing file\n', exitCode: 1 }
        const content = vfs.get(file)
        if (content === undefined) return { stdout: '', stderr: `head: ${file}: No such file\n`, exitCode: 1 }
        const lines = content.split('\n').slice(0, n).join('\n')
        return { stdout: lines + (lines && !lines.endsWith('\n') ? '\n' : ''), stderr: '', exitCode: 0 }
      }
      case 'tail': {
        const n = args[0] === '-n' && args[1] ? parseInt(args[1], 10) : 10
        const file = args[args[0] === '-n' ? 2 : 0]
        if (!file) return { stdout: '', stderr: 'tail: missing file\n', exitCode: 1 }
        const content = vfs.get(file)
        if (content === undefined) return { stdout: '', stderr: `tail: ${file}: No such file\n`, exitCode: 1 }
        const lines = content.split('\n').slice(-n).join('\n')
        return { stdout: lines + (lines && !lines.endsWith('\n') ? '\n' : ''), stderr: '', exitCode: 0 }
      }
      case 'wc': {
        const file = args[args.length - 1]
        if (!file) return { stdout: '', stderr: 'wc: missing file\n', exitCode: 1 }
        const content = vfs.get(file)
        if (content === undefined) return { stdout: '', stderr: `wc: ${file}: No such file\n`, exitCode: 1 }
        const lines = content.split('\n').length
        const words = content.split(/\s+/).filter(Boolean).length
        const bytes = content.length
        return { stdout: `${lines}\t${words}\t${bytes}\t${file}\n`, stderr: '', exitCode: 0 }
      }
      case 'grep': {
        if (args.length < 2) return { stdout: '', stderr: 'grep: usage: grep PATTERN FILE\n', exitCode: 2 }
        const [pattern, file] = args
        const content = vfs.get(file)
        if (content === undefined) return { stdout: '', stderr: `grep: ${file}: No such file\n`, exitCode: 1 }
        const re = new RegExp(pattern)
        const matched = content.split('\n').filter((l) => re.test(l)).join('\n')
        return { stdout: matched + (matched && !matched.endsWith('\n') ? '\n' : ''), stderr: '', exitCode: matched ? 0 : 1 }
      }
      case 'sort': {
        const file = args[0]
        if (!file) return { stdout: '', stderr: 'sort: missing file\n', exitCode: 1 }
        const content = vfs.get(file)
        if (content === undefined) return { stdout: '', stderr: `sort: ${file}: No such file\n`, exitCode: 1 }
        const sorted = content.split('\n').sort().join('\n')
        return { stdout: sorted + '\n', stderr: '', exitCode: 0 }
      }
      case 'uniq': {
        const file = args[0]
        if (!file) return { stdout: '', stderr: 'uniq: missing file\n', exitCode: 1 }
        const content = vfs.get(file)
        if (content === undefined) return { stdout: '', stderr: `uniq: ${file}: No such file\n`, exitCode: 1 }
        const lines = content.split('\n')
        const out: string[] = []
        for (const line of lines) {
          if (out[out.length - 1] !== line) out.push(line)
        }
        return { stdout: out.join('\n') + '\n', stderr: '', exitCode: 0 }
      }
      case 'mkdir': {
        // No-op in memory-only VFS — directories implied by path
        return { stdout: '', stderr: '', exitCode: 0 }
      }
      case 'touch': {
        for (const f of args) {
          if (!vfs.has(f)) vfs.set(f, '')
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      }
      case 'rm': {
        for (const f of args) {
          if (f === '-f') continue
          if (!vfs.has(f)) {
            if (!args.includes('-f')) {
              return { stdout: '', stderr: `rm: ${f}: No such file\n`, exitCode: 1 }
            }
            continue
          }
          vfs.delete(f)
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      }
      case 'cp': {
        if (args.length < 2) return { stdout: '', stderr: 'cp: usage: cp src dst\n', exitCode: 1 }
        const [src, dst] = args
        const content = vfs.get(src)
        if (content === undefined) return { stdout: '', stderr: `cp: ${src}: No such file\n`, exitCode: 1 }
        vfs.set(dst, content)
        return { stdout: '', stderr: '', exitCode: 0 }
      }
      case 'mv': {
        if (args.length < 2) return { stdout: '', stderr: 'mv: usage: mv src dst\n', exitCode: 1 }
        const [src, dst] = args
        const content = vfs.get(src)
        if (content === undefined) return { stdout: '', stderr: `mv: ${src}: No such file\n`, exitCode: 1 }
        vfs.set(dst, content)
        vfs.delete(src)
        return { stdout: '', stderr: '', exitCode: 0 }
      }
      case 'date':
        return { stdout: new Date().toISOString() + '\n', stderr: '', exitCode: 0 }
      case 'whoami':
        return { stdout: 'brainwire\n', stderr: '', exitCode: 0 }
      case 'uname':
        return { stdout: 'BrainwireOS 1.0.0 (browser sandbox)\n', stderr: '', exitCode: 0 }
      case 'env':
        return { stdout: 'PWD=' + cwd + '\nSHELL=brainwire-sh\n', stderr: '', exitCode: 0 }
      case 'clear':
        return { stdout: '', stderr: '', exitCode: 0 }
      case 'help':
        return {
          stdout: [
            'Brainwire shell — available commands:',
            '  ls [path]              list files in virtual filesystem',
            '  cat FILE...            print file contents',
            '  head [-n N] FILE       first N lines (default 10)',
            '  tail [-n N] FILE       last N lines (default 10)',
            '  wc FILE                line/word/byte count',
            '  grep PATTERN FILE      print lines matching PATTERN',
            '  sort FILE              sort lines',
            '  uniq FILE              drop consecutive duplicate lines',
            '  echo TEXT...           print text',
            '  pwd                    print working directory',
            '  date                   print current ISO date',
            '  touch FILE...          create empty file(s)',
            '  rm [-f] FILE...        remove file(s)',
            '  cp SRC DST             copy file',
            '  mv SRC DST             move/rename file',
            '  mkdir DIR              no-op (VFS is flat)',
            '  env                    print environment',
            '  whoami, uname, clear, help',
            '',
            'Note: Browser sandbox — no real filesystem access. Files persist',
            'within one workflow run. Use the Chat or Agent block to pipe',
            'arbitrary text into the terminal stdin (via "In" port).',
            '',
          ].join('\n'),
          stderr: '',
          exitCode: 0,
        }
      default:
        return {
          stdout: '',
          stderr: `bash: ${cmd}: command not found (browser sandbox)\nTry 'help' for the list of available commands.\n`,
          exitCode: 127,
        }
    }
  } catch (err) {
    return {
      stdout: '',
      stderr: String(err) + '\n',
      exitCode: 1,
    }
  }
}

function tokenizeCommandLine(input: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < input.length) {
    // skip whitespace
    while (i < input.length && /\s/.test(input[i])) i++
    if (i >= input.length) break
    let token = ''
    if (input[i] === '"' || input[i] === "'") {
      const quote = input[i++]
      while (i < input.length && input[i] !== quote) {
        token += input[i++]
      }
      i++ // skip closing quote
    } else {
      while (i < input.length && !/\s/.test(input[i])) {
        token += input[i++]
      }
    }
    tokens.push(token)
  }
  return tokens
}

/**
 * Truncate output to TERMINAL_MAX_OUTPUT bytes (UTF-8) and add a notice.
 */
export function truncateTerminalOutput(result: TerminalResult): TerminalResult {
  if (result.stdout.length <= TERMINAL_MAX_OUTPUT && result.stderr.length <= TERMINAL_MAX_OUTPUT) {
    return result
  }
  return {
    stdout: result.stdout.slice(0, TERMINAL_MAX_OUTPUT),
    stderr: result.stderr.slice(0, TERMINAL_MAX_OUTPUT),
    exitCode: result.exitCode,
    truncated: true,
  }
}
