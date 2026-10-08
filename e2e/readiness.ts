export type ReadinessBookmark = {
  enrichment_status?: string;
  ai_summary?: string;
  ai_category?: string;
  topics?: string[];
};

export function summarizeAccountReadiness(bookmarks: ReadinessBookmark[]) {
  return {
    bookmarks: bookmarks.length,
    completedEnrichments: bookmarks.filter(item => item.enrichment_status === 'completed' && item.ai_summary && item.ai_category && item.topics?.length).length,
    categories: new Set(bookmarks.map(item => item.ai_category).filter(Boolean)).size,
    topics: new Set(bookmarks.flatMap(item => item.topics || [])).size,
  };
}
