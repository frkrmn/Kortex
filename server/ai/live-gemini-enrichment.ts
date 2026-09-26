import { GoogleGenAI } from '@google/genai';
import { economicsAdmin } from '../economics/credit-service';
import {
  GEMINI_ENRICHMENT_INSTRUCTION, GEMINI_ENRICHMENT_MODEL, GEMINI_PROMPT_VERSION,
  GEMINI_RESPONSE_SCHEMA, GEMINI_SCHEMA_VERSION, geminiInputParts, parseGeminiEnrichment,
} from './gemini-v1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxAttempts = 3;

function boundedInt(value: string | undefined, fallback: number, maximum: number) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, maximum) : fallback;
}

export function enrichmentControls(env: NodeJS.ProcessEnv = process.env) {
  const ownerId = env.GEMINI_ENRICHMENT_OWNER_USER_ID;
  return {
    enabled: env.GEMINI_ENRICHMENT_ENABLED === 'true' && env.GEMINI_ENRICHMENT_FREE_TIER_CONFIRMED === 'true'
      && Boolean(ownerId && UUID.test(ownerId)) && Boolean(env.GEMINI_API_KEY),
    ownerId: ownerId && UUID.test(ownerId) ? ownerId : null,
    batchSize: boundedInt(env.GEMINI_ENRICHMENT_BATCH_SIZE, 5, 20),
    concurrency: boundedInt(env.GEMINI_ENRICHMENT_CONCURRENCY, 1, 2),
    rolloutCap: boundedInt(env.GEMINI_ENRICHMENT_ROLLOUT_CAP, 0, 10000),
  };
}

export function isControlledEnrichmentOwner(userId: string, env: NodeJS.ProcessEnv = process.env) {
  const controls = enrichmentControls(env);
  return controls.enabled && controls.ownerId === userId && controls.rolloutCap > 0;
}

export async function enqueueOwnedNewBookmarks(userId: string, savedItemIds: string[]) {
  if (!isControlledEnrichmentOwner(userId) || savedItemIds.length === 0) return 0;
  const db = economicsAdmin();
  const uniqueIds = [...new Set(savedItemIds)];
  const { data: owned, error: ownershipError } = await db.from('saved_items')
    .select('id').eq('user_id', userId).eq('source', 'twitter').in('id', uniqueIds);
  if (ownershipError) throw ownershipError;
  const rows = (owned || []).map(item => ({
    saved_item_id: item.id, user_id: userId, provider: 'gemini', model: GEMINI_ENRICHMENT_MODEL,
    prompt_version: GEMINI_PROMPT_VERSION, schema_version: GEMINI_SCHEMA_VERSION,
  }));
  if (!rows.length) return 0;
  const { error } = await db.from('saved_item_enrichments').upsert(rows, {
    onConflict: 'saved_item_id,prompt_version,schema_version', ignoreDuplicates: true,
  });
  if (error) throw error;
  return rows.length;
}

/** Queues a bounded owner-only slice of existing records. Safe to resume. */
export async function queueControlledBackfill(limit?: number) {
  const controls = enrichmentControls();
  if (!controls.enabled || !controls.ownerId || !controls.rolloutCap) throw new Error('Controlled Gemini enrichment is disabled.');
  const db = economicsAdmin();
  const requested = Math.min(limit ?? controls.batchSize, controls.batchSize);
  const { data: existing, error: existingError } = await db.from('saved_item_enrichments')
    .select('saved_item_id').eq('user_id', controls.ownerId)
    .eq('prompt_version', GEMINI_PROMPT_VERSION).eq('schema_version', GEMINI_SCHEMA_VERSION);
  if (existingError) throw existingError;
  const used = new Set((existing || []).map(row => row.saved_item_id));
  const { data: items, error } = await db.from('saved_items').select('id,user_id,source,external_content_status')
    .eq('user_id', controls.ownerId).eq('source', 'twitter').order('saved_at', { ascending: false }).limit(1000);
  if (error) throw error;
  const remaining = Math.max(0, controls.rolloutCap - used.size);
  const candidates = (items || []).filter(item => !used.has(item.id)
    && !['unavailable', 'deleted', 'restricted'].includes(item.external_content_status || 'available'))
    .slice(0, Math.min(requested, remaining));
  return enqueueOwnedNewBookmarks(controls.ownerId, candidates.map(item => item.id));
}

export type EnrichmentRunStats = {
  attempted: number; completed: number; failed: number; retries: number;
  inputTokens: number; outputTokens: number; categories: Record<string, number>;
};

function providerStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown; statusCode?: unknown }).status
    ?? (error as { statusCode?: unknown }).statusCode;
  return typeof status === 'number' ? status : null;
}

async function processClaim(ai: GoogleGenAI, userId: string, rolloutCap: number, stats: EnrichmentRunStats) {
  const db = economicsAdmin();
  const { data, error } = await db.rpc('claim_gemini_enrichment', {
    p_user_id: userId, p_max_attempts: maxAttempts, p_rollout_cap: rolloutCap,
  });
  if (error) throw error;
  const claim = data?.[0];
  if (!claim) return false;
  stats.attempted++;
  const { data: item, error: itemError } = await db.from('saved_items')
    .select('id,user_id,source,content,media,external_content_status').eq('id', claim.saved_item_id)
    .eq('user_id', userId).eq('source', 'twitter').maybeSingle();
  if (itemError) throw itemError;
  if (!item || ['unavailable', 'deleted', 'restricted'].includes(item.external_content_status || 'available')) {
    await db.from('saved_item_enrichments').update({ status: 'failed', attempts: maxAttempts, error_code: 'source_unavailable' })
      .eq('id', claim.id).eq('user_id', userId);
    stats.failed++;
    return true;
  }
  try {
    const response = await ai.interactions.create({
      model: GEMINI_ENRICHMENT_MODEL,
      input: geminiInputParts(item), system_instruction: GEMINI_ENRICHMENT_INSTRUCTION,
      response_format: { type: 'text', mime_type: 'application/json', schema: GEMINI_RESPONSE_SCHEMA },
    });
    if (response.status !== 'completed' || !response.output_text) throw new Error('invalid_response');
    const result = parseGeminiEnrichment(response.output_text);
    const inputTokens = response.usage?.total_input_tokens ?? 0;
    const outputTokens = response.usage?.total_output_tokens ?? 0;
    const { error: saveError } = await db.from('saved_item_enrichments').update({
      status: 'completed', summary: result.summary, category: result.category,
      topics: result.topics, key_concepts: result.key_concepts,
      input_tokens: inputTokens, output_tokens: outputTokens, error_code: null,
      enriched_at: new Date().toISOString(),
    }).eq('id', claim.id).eq('user_id', userId);
    if (saveError) throw saveError;
    stats.completed++;
    stats.inputTokens += inputTokens;
    stats.outputTokens += outputTokens;
    stats.categories[result.category] = (stats.categories[result.category] || 0) + 1;
  } catch (error) {
    const status = providerStatus(error);
    const transient = status === 429 || (status !== null && status >= 500);
    const retryable = transient && claim.attempts < maxAttempts;
    const delay = Math.min(60_000 * 2 ** (claim.attempts - 1), 240_000);
    const { error: saveError } = await db.from('saved_item_enrichments').update({
      status: 'failed', attempts: retryable ? claim.attempts : maxAttempts,
      next_attempt_at: new Date(Date.now() + delay).toISOString(),
      error_code: transient ? `provider_${status}` : 'invalid_or_provider_response',
    }).eq('id', claim.id).eq('user_id', userId);
    if (saveError) throw saveError;
    stats.failed++;
    if (retryable) stats.retries++;
    console.warn(JSON.stringify({ event: 'gemini_enrichment_failed', itemId: claim.saved_item_id, status,
      retryable, attempts: claim.attempts }));
    // One provider failure stops this controlled batch. A later invocation may
    // retry transient failures after the bounded backoff.
    return false;
  }
  return true;
}

/** Drains a bounded batch. No user-controlled ID or public route reaches this. */
export async function runControlledGeminiEnrichment(limit?: number): Promise<EnrichmentRunStats> {
  const controls = enrichmentControls();
  if (!controls.enabled || !controls.ownerId || !controls.rolloutCap) throw new Error('Controlled Gemini enrichment is disabled.');
  const db = economicsAdmin();
  const { count, error } = await db.from('saved_item_enrichments').select('id', { count: 'exact', head: true })
    .eq('user_id', controls.ownerId).eq('prompt_version', GEMINI_PROMPT_VERSION)
    .eq('schema_version', GEMINI_SCHEMA_VERSION).eq('status', 'completed');
  if (error) throw error;
  const remaining = Math.max(0, controls.rolloutCap - (count || 0));
  const requested = Math.min(limit ?? controls.batchSize, controls.batchSize, remaining);
  const stats: EnrichmentRunStats = { attempted: 0, completed: 0, failed: 0, retries: 0,
    inputTokens: 0, outputTokens: 0, categories: {} };
  if (!requested) return stats;
  // A previous invocation can disappear while a provider request is in flight.
  // Reclaim only stale work; completed rows are never reopened.
  const staleBefore = new Date(Date.now() - 20 * 60_000).toISOString();
  const { error: staleError } = await db.from('saved_item_enrichments')
    .update({ status: 'failed', error_code: 'worker_interrupted', next_attempt_at: new Date().toISOString() })
    .eq('user_id', controls.ownerId).eq('status', 'processing').lt('updated_at', staleBefore);
  if (staleError) throw staleError;
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, httpOptions: { timeout: 90_000 } });
  // The conservative default is serial; a controlled override permits two workers.
  let reserved = 0;
  const workers = Array.from({ length: Math.min(requested, controls.concurrency) }, async () => {
    while (reserved++ < requested) {
      const found = await processClaim(ai, controls.ownerId!, controls.rolloutCap, stats);
      if (!found) break;
    }
  });
  await Promise.all(workers);
  return stats;
}

export async function controlledEnrichmentStats() {
  const controls = enrichmentControls();
  if (!controls.ownerId) throw new Error('Controlled owner is not configured.');
  const db = economicsAdmin();
  const [items, results] = await Promise.all([
    db.from('saved_items').select('id', { count: 'exact', head: true }).eq('user_id', controls.ownerId),
    db.from('saved_item_enrichments').select('status,category').eq('user_id', controls.ownerId)
      .eq('prompt_version', GEMINI_PROMPT_VERSION).eq('schema_version', GEMINI_SCHEMA_VERSION),
  ]);
  if (items.error || results.error) throw items.error || results.error;
  const counts = { total: items.count || 0, completed: 0, pending: 0, processing: 0, failed: 0,
    categories: {} as Record<string, number> };
  for (const row of results.data || []) {
    counts[row.status as 'completed' | 'pending' | 'processing' | 'failed']++;
    if (row.status === 'completed' && row.category) counts.categories[row.category] = (counts.categories[row.category] || 0) + 1;
  }
  return counts;
}
