import { z } from 'zod';
import { ENRICHMENT_CATEGORIES } from '../../src/config/enrichment';
import { publicXImageUrls } from '../ai/x-media-urls';
export { publicXImageUrls } from '../ai/x-media-urls';

export const CATEGORIES = ENRICHMENT_CATEGORIES;

export const enrichmentSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  category: z.enum(CATEGORIES),
  topics: z.array(z.string().trim().min(1).max(80)).max(5),
  key_concepts: z.array(z.string().trim().min(1).max(80)).max(6),
}).strict();

export type Enrichment = z.infer<typeof enrichmentSchema>;

export type BenchmarkItem = {
  id: string;
  user_id: string;
  content: string;
  source: string;
  media: unknown;
  external_content_status?: string | null;
  saved_at: string;
};

export function validateBenchmarkConfig(env: NodeJS.ProcessEnv): string {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing in the server environment.');
  const owner = env.GEMINI_BENCHMARK_USER_ID;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!owner || !uuid.test(owner)) throw new Error('A controlled-owner GEMINI_BENCHMARK_USER_ID UUID is required.');
  if (env.GEMINI_BENCHMARK_FREE_TIER_CONFIRMED !== 'true') {
    throw new Error('Confirm billing is disabled and Free Tier is active with GEMINI_BENCHMARK_FREE_TIER_CONFIRMED=true.');
  }
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Server-side Supabase configuration is missing.');
  }
  return owner;
}

export function parseEnrichment(value: string): Enrichment {
  return enrichmentSchema.parse(JSON.parse(value));
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export function selectSample(rows: BenchmarkItem[], ownerId: string): BenchmarkItem[] {
  const eligible = rows.filter((row) => row.user_id === ownerId && row.source === 'twitter'
    && row.external_content_status !== 'unavailable' && row.external_content_status !== 'deleted'
    && row.external_content_status !== 'restricted');
  const sorted = [...eligible].sort((a, b) => stableHash(a.id) - stableHash(b.id) || a.id.localeCompare(b.id));
  const images = sorted.filter((row) => publicXImageUrls(row.media).length > 0).slice(0, 8);
  const picked = new Map(images.map((row) => [row.id, row]));
  const groups = [
    sorted.filter((row) => row.content.length < 90),
    sorted.filter((row) => row.content.length >= 90 && row.content.length < 280),
    sorted.filter((row) => row.content.length >= 280),
    sorted.filter((row) => /\b(ai|llm|agent|model|gpt|gemini)\b/i.test(row.content)),
    sorted.filter((row) => /\b(product|startup|business|marketing|growth|design)\b/i.test(row.content)),
    sorted.filter((row) => /\b(bitcoin|crypto|finance|market|stock)\b/i.test(row.content)),
  ];
  for (const group of groups) {
    for (const row of group.slice(0, 3)) if (picked.size < 25) picked.set(row.id, row);
  }
  for (const row of sorted) if (picked.size < 25) picked.set(row.id, row);
  if (picked.size < 25) throw new Error(`Only ${picked.size} eligible owned X bookmarks; 25 required.`);
  return [...picked.values()].slice(0, 25);
}
