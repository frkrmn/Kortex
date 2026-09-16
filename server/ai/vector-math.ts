import crypto from 'crypto';

/**
 * Calculates cosine similarity between two numeric vectors of identical dimension.
 * Returns a value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized embeddings).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalizes a vector to unit length (L2 norm = 1.0).
 */
export function normalizeVector(v: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < v.length; i++) {
    norm += v[i] * v[i];
  }
  const magnitude = Math.sqrt(norm);
  if (magnitude === 0) return v;
  return v.map(val => val / magnitude);
}

/**
 * Generates a deterministic, semantic-aware dense embedding vector
 * used for Demo Mode, unit testing, and offline fallback scenarios.
 * It combines bag-of-words token hashing with character n-grams to preserve lexical
 * and semantic proximity without requiring external API calls.
 */
export function generateDeterministicVector(text: string, dimension = 768): number[] {
  const vec = new Array(dimension).fill(0);
  if (!text || !text.trim()) {
    return vec;
  }

  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);

  // 1. Word token projections
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    const hash = crypto.createHash('md5').update(word).digest();
    
    // Distribute entropy across dimensions
    for (let i = 0; i < 16; i++) {
      const dimIndex = (hash[i] * 31 + i * 17 + wIdx * 7) % dimension;
      const weight = ((hash[(i + 1) % 16] / 128.0) - 1.0) / Math.sqrt(words.length);
      vec[dimIndex] += weight;
    }
  }

  // 2. Character 3-gram projections for subword / fuzzy matching
  for (let i = 0; i < Math.min(normalized.length - 2, 200); i++) {
    const trigram = normalized.slice(i, i + 3);
    const hash = crypto.createHash('sha1').update(trigram).digest();
    const dimIndex = (hash[0] * 256 + hash[1]) % dimension;
    vec[dimIndex] += 0.15;
  }

  return normalizeVector(vec);
}
