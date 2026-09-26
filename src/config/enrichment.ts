export const ENRICHMENT_CATEGORIES = [
  'AI', 'Engineering', 'Product', 'Business', 'Finance', 'Crypto',
  'Design', 'Marketing', 'Career', 'Science', 'News', 'Books', 'Other',
] as const;

export type EnrichmentCategory = typeof ENRICHMENT_CATEGORIES[number];
