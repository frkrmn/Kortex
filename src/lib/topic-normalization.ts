const TOPIC_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  ai: 'AI',
  'artificial intelligence': 'AI',
  'book recommendation': 'Book Recommendation',
  'book recommendations': 'Book Recommendation',
  'open source': 'Open Source',
  'open source software': 'Open Source',
  'open-source software': 'Open Source',
  'prompt engineering': 'Prompt Engineering',
  'trading indicator': 'Trading Indicator',
  'trading indicators': 'Trading Indicators',
  'ai video generation': 'AI Video Generation',
  'market analysis': 'Market Analysis',
  'vibe coding': 'Vibe Coding',
  'ai coding agents': 'AI Coding Agents',
  'app monetization': 'App Monetization',
  'film recommendations': 'Film Recommendations',
  'market research': 'Market Research',
  'digital products': 'Digital Products',
  'etsy selling': 'Etsy Selling',
  'software testing': 'Software Testing',
  'trading strategy': 'Trading Strategy',
  'trading strategies': 'Trading Strategy',
  'github repository': 'GitHub Repository',
  'github repositories': 'GitHub Repository',
  workflow: 'Workflow',
  workflows: 'Workflow',
  'investment strategy': 'Investment Strategy',
  'investment strategies': 'Investment Strategy',
});

export function normalizeTopic(rawTopic: string): string {
  const cleaned = rawTopic.trim().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim();
  if (!cleaned) return '';
  return TOPIC_ALIASES[cleaned.toLowerCase()] || cleaned;
}

export function normalizeTopics(rawTopics: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const rawTopic of rawTopics) {
    const topic = normalizeTopic(rawTopic);
    const key = topic.toLowerCase();
    if (!topic || seen.has(key)) continue;
    seen.add(key);
    normalized.push(topic);
  }
  return normalized;
}
