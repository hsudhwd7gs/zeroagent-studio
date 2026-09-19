// Reddit scraper — uses Reddit's public JSON endpoint (append .json to any URL).
// No API key needed; rate-limited but generous for personal use.

export async function runRedditScraper(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const subreddit = (config.subreddit?.trim() || input.trim()).replace(/^\/?r\//, '')
  if (!subreddit) throw new Error('subreddit required')
  const sort = config.sort ?? 'hot'
  const limit = parseInt(config.limit ?? '10', 10)
  const timeframe = config.timeframe ?? 'day'

  const url = sort === 'top'
    ? `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/top.json?limit=${limit}&t=${timeframe}`
    : `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=${limit}`

  const res = await fetch(url, { headers: { 'User-Agent': 'Brainwire-Studio/2.0' } })
  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`)
  const data = await res.json() as any
  const posts = (data?.data?.children ?? []).map((p: any) => ({
    title: p.data.title,
    author: p.data.author,
    score: p.data.score,
    upvoteRatio: p.data.upvote_ratio,
    numComments: p.data.num_comments,
    url: p.data.url,
    permalink: `https://reddit.com${p.data.permalink}`,
    created: new Date(p.data.created_utc * 1000).toISOString(),
    selftext: p.data.selftext?.slice(0, 500),
    flair: p.data.link_flair_text,
  }))
  return JSON.stringify({ ok: true, subreddit, sort, count: posts.length, posts }, null, 2)
}
