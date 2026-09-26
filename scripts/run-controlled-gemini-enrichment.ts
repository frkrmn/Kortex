/** Private, bounded owner-only backfill runner. No X calls or public route. */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { controlledEnrichmentStats, queueControlledBackfill, runControlledGeminiEnrichment } from '../server/ai/live-gemini-enrichment';

loadEnv({ path: resolve(process.cwd(), '.env.local'), override: false, quiet: true });

const stageSize = Number(process.argv[2] ?? 20);
if (!Number.isSafeInteger(stageSize) || stageSize < 1 || stageSize > 20) {
  throw new Error('Stage size must be between 1 and 20.');
}

const before = await controlledEnrichmentStats();
console.log(JSON.stringify({ event: 'gemini_stage_before', counts: before }));
let queued = 0;
while (queued < stageSize) {
  const added = await queueControlledBackfill(stageSize - queued);
  if (!added) break;
  queued += added;
}

const combined = { attempted: 0, completed: 0, failed: 0, retries: 0, inputTokens: 0, outputTokens: 0,
  categories: {} as Record<string, number> };
while (combined.attempted < stageSize) {
  const result = await runControlledGeminiEnrichment(stageSize - combined.attempted);
  for (const key of ['attempted', 'completed', 'failed', 'retries', 'inputTokens', 'outputTokens'] as const) {
    combined[key] += result[key];
  }
  for (const [category, count] of Object.entries(result.categories)) {
    combined.categories[category] = (combined.categories[category] || 0) + count;
  }
  if (!result.attempted || result.failed) break;
}
const after = await controlledEnrichmentStats();
console.log(JSON.stringify({ event: 'gemini_stage_complete', queued, result: combined, counts: after }));
if (combined.failed) process.exitCode = 1;
