export type ActiveEnrichmentStatus = 'pending' | 'processing';

export function enrichmentStatusPresentation(status: ActiveEnrichmentStatus) {
  return status === 'processing'
    ? { busy: true, title: 'AI enrichment in progress', detail: 'Analyzing content and classifying topics.', summary: 'AI · Organizing...' }
    : { busy: false, title: 'AI enrichment queued', detail: 'Waiting for the next background enrichment run.', summary: 'AI · Queued for enrichment' };
}
