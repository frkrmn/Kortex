import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bookmark } from '../../src/types';
import { GEMINI_PROMPT_VERSION, GEMINI_SCHEMA_VERSION } from './gemini-v1';

type EnrichmentRow = {
  saved_item_id: string; status: Bookmark['enrichment_status']; summary: string | null;
  category: Bookmark['ai_category'] | null; topics: string[] | null;
  key_concepts: string[] | null; model: string; enriched_at: string | null;
};

export async function attachLiveEnrichments(db: SupabaseClient, userId: string, bookmarks: Bookmark[]) {
  if (!bookmarks.length) return bookmarks;
  const { data, error } = await db.from('saved_item_enrichments')
    .select('saved_item_id,status,summary,category,topics,key_concepts,model,enriched_at')
    .eq('user_id', userId).eq('prompt_version', GEMINI_PROMPT_VERSION)
    .eq('schema_version', GEMINI_SCHEMA_VERSION).in('saved_item_id', bookmarks.map(item => item.id));
  // The additive migration may not yet be deployed. Preserve bookmark reading.
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return bookmarks;
    throw error;
  }
  const byId = new Map((data as EnrichmentRow[] || []).map(row => [row.saved_item_id, row]));
  return bookmarks.map(bookmark => {
    const row = byId.get(bookmark.id);
    if (!row) return bookmark;
    const available = bookmark.external_content_status === undefined || bookmark.external_content_status === 'available';
    return {
      ...bookmark,
      enrichment_status: row.status,
      ai_summary: available && row.status === 'completed' ? row.summary || '' : '',
      ai_category: available && row.status === 'completed' ? row.category || undefined : undefined,
      topics: available && row.status === 'completed' ? row.topics || [] : [],
      key_concepts: available && row.status === 'completed' ? row.key_concepts || [] : undefined,
      enrichment_model: row.model,
      enriched_at: row.enriched_at || undefined,
    };
  });
}
