// GitHub API node — repo info, issues, PRs, user, search.
// Uses GitHub REST API. Token (GITHUB_TOKEN) auto-injected by the worker.

export async function runGithubApi(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const workerUrl = window.location.origin
  const action = config.action ?? 'repo'

  let url: string
  if (action === 'repo') {
    const repo = config.repo?.trim() || input.trim()
    if (!repo) throw new Error('repo required (owner/repo)')
    url = `https://api.github.com/repos/${repo}`
  } else if (action === 'issues') {
    const repo = config.repo?.trim() || input.trim()
    if (!repo) throw new Error('repo required (owner/repo)')
    const state = config.state ?? 'open'
    url = `https://api.github.com/repos/${repo}/issues?state=${state}&per_page=30`
  } else if (action === 'pulls') {
    const repo = config.repo?.trim() || input.trim()
    if (!repo) throw new Error('repo required (owner/repo)')
    const state = config.state ?? 'open'
    url = `https://api.github.com/repos/${repo}/pulls?state=${state}&per_page=30`
  } else if (action === 'user') {
    const user = config.repo?.trim() || input.trim() // re-use repo field as user
    if (!user) throw new Error('username required')
    url = `https://api.github.com/users/${user}`
  } else if (action === 'search') {
    const q = config.query?.trim() || input.trim()
    if (!q) throw new Error('query required for search')
    url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=10`
  } else {
    throw new Error(`Unknown action: ${action}`)
  }

  const res = await fetch(`${workerUrl}/api/proxy?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error(`GitHub ${action} failed: ${res.status} ${await res.text()}`)
  return JSON.stringify(await res.json(), null, 2)
}
