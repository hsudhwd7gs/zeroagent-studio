// Prompt Bucket — returns a curated prompt template based on category + optional templateId.
// Templates are stored locally in this file; user can request a specific category.

interface PromptTemplate {
  id: string
  label: string
  category: 'writing' | 'coding' | 'research' | 'marketing' | 'education' | 'summarization' | 'translation'
  prompt: string
}

const TEMPLATES: PromptTemplate[] = [
  // Writing
  { id: 'blog-post-intro', label: 'Blog post intro', category: 'writing', prompt: 'Write a 100-word introduction for a blog post titled: "{{input}}". Hook the reader with a surprising fact, then state the main thesis.' },
  { id: 'story-starter', label: 'Story starter', category: 'writing', prompt: 'Start a short story with this premise: "{{input}}". 250 words max. First-person POV.' },
  { id: 'email-draft', label: 'Professional email', category: 'writing', prompt: 'Draft a professional, polite email about: {{input}}. Keep under 200 words. Include subject line.' },
  // Coding
  { id: 'code-review', label: 'Code review', category: 'coding', prompt: 'Review this code for bugs, performance, and best practices. Point out specific issues with line references:\n\n```\n{{input}}\n```' },
  { id: 'function-from-spec', label: 'Function from spec', category: 'coding', prompt: 'Write a TypeScript function that satisfies this spec: {{input}}. Include JSDoc, error handling, and one example call.' },
  { id: 'explain-code', label: 'Explain code', category: 'coding', prompt: 'Explain this code in plain English for a beginner:\n\n```\n{{input}}\n```' },
  // Research
  { id: 'summarize-research', label: 'Summarize research', category: 'research', prompt: 'Summarize the key findings, methodology, and limitations in 5 bullet points:\n\n{{input}}' },
  { id: 'compare-approaches', label: 'Compare approaches', category: 'research', prompt: 'Compare these approaches. Output a markdown table with pros, cons, and best use case:\n\n{{input}}' },
  { id: 'literature-review', label: 'Literature review', category: 'research', prompt: 'Write a 3-paragraph literature review covering these sources:\n\n{{input}}' },
  // Marketing
  { id: 'ad-copy', label: 'Ad copy', category: 'marketing', prompt: 'Write 3 variations of ad copy for this product, each under 100 characters:\n\n{{input}}' },
  { id: 'landing-headline', label: 'Landing headline', category: 'marketing', prompt: 'Write 5 punchy landing-page headlines for: {{input}}. Each under 60 characters.' },
  { id: 'social-caption', label: 'Social caption', category: 'marketing', prompt: 'Write a social caption with hashtags for this post: {{input}}. Keep under 220 chars.' },
  // Education
  { id: 'explain-concept', label: 'Explain concept', category: 'education', prompt: 'Explain this concept at three levels: beginner (5 yr old), teenager, expert:\n\n{{input}}' },
  { id: 'quiz-questions', label: 'Quiz questions', category: 'education', prompt: 'Write 5 multiple-choice quiz questions about: {{input}}. Include answer key with brief explanations.' },
  { id: 'study-guide', label: 'Study guide', category: 'education', prompt: 'Create a study guide for this topic with definitions, examples, and 5 practice questions:\n\n{{input}}' },
  // Summarization
  { id: 'tldr', label: 'TL;DR', category: 'summarization', prompt: 'Summarize in one sentence: {{input}}' },
  { id: 'bullet-summary', label: 'Bullet summary', category: 'summarization', prompt: 'Summarize as 5 concise bullets:\n\n{{input}}' },
  { id: 'executive-summary', label: 'Executive summary', category: 'summarization', prompt: 'Write a 200-word executive summary for an executive audience:\n\n{{input}}' },
  // Translation
  { id: 'translate-to', label: 'Translate (specify target in input)', category: 'translation', prompt: 'Translate this text. Target language: specified in input. Return only the translation, no notes:\n\n{{input}}' },
  { id: 'localize', label: 'Localize content', category: 'translation', prompt: 'Localize this content for cultural relevance while preserving meaning:\n\n{{input}}' },
]

export async function runPromptBucket(
  input: string,
  config: Record<string, string>
): Promise<string> {
  const category = config.category as PromptTemplate['category'] | undefined
  const templateId = config.templateId?.trim()

  // Pick template
  let chosen: PromptTemplate | undefined
  if (templateId) {
    chosen = TEMPLATES.find((t) => t.id === templateId)
  }
  if (!chosen && category) {
    // Random pick within the category
    const pool = TEMPLATES.filter((t) => t.category === category)
    if (pool.length > 0) {
      chosen = pool[Math.floor(Math.random() * pool.length)]
    }
  }
  if (!chosen) {
    // Random overall
    chosen = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
  }

  // Substitute input
  const prompt = chosen.prompt.replace(/\{\{input\}\}/g, input.trim() || '...')
  return JSON.stringify({
    ok: true,
    templateId: chosen.id,
    templateLabel: chosen.label,
    category: chosen.category,
    prompt,
  }, null, 2)
}
