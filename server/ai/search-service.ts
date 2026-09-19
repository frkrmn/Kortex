import { store } from '../store';
import { Bookmark } from '../../src/types';
import { SearchFilters, SearchResultItem, SearchResponse } from './types';
import { cosineSimilarity } from './vector-math';
import { getEmbeddingPipeline } from './embedding-pipeline';

export interface SearchOptions {
  userId: string;
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  isDemo?: boolean;
}

export interface RelatedBookmarksOptions {
  userId: string;
  savedItemId: string;
  limit?: number;
  minSimilarity?: number;
  isDemo?: boolean;
}

export class SearchService {
  /**
   * Main Hybrid Search entry point.
   * Runs lexical search and semantic query embedding concurrently,
   * combines candidate sets using Reciprocal Rank Fusion (RRF),
   * applies exact lexical matching boosts, and returns ranked results.
   */
  public static async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = performance.now();
    const { userId, query, filters, limit = 20, offset = 0, isDemo = false } = options;

    const trimmedQuery = (query || '').trim();

    // 1. Query validation and edge cases
    if (!trimmedQuery) {
      // Empty query: return standard filtered bookmarks
      const filtered = this.applyFilters(store.getBookmarks(userId), filters);
      const paginated = filtered.slice(offset, offset + limit);
      return {
        query: '',
        results: paginated.map((item) => ({
          item,
          score: 1.0,
          matchType: 'lexical',
        })),
        total: filtered.length,
        mode: 'lexical',
        latencyMs: Math.round(performance.now() - startTime),
      };
    }

    // Normalized query terms
    const normalizedQuery = trimmedQuery.toLowerCase();
    const queryWords = normalizedQuery
      .replace(/[#@.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let lexicalLatency = 0;
    let vectorLatency = 0;
    let mode: 'hybrid' | 'lexical' | 'semantic' = 'hybrid';

    // 2. Concurrency: Launch Lexical Retrieval and Query Vector Embedding concurrently
    const lexicalPromise = (async () => {
      const lexStart = performance.now();
      try {
        const results = this.retrieveLexical(userId, trimmedQuery, normalizedQuery, queryWords, filters);
        lexicalLatency = Math.round(performance.now() - lexStart);
        return results;
      } catch (err) {
        console.warn('[SearchService] Lexical retrieval failed:', err);
        return [];
      }
    })();

    const semanticPromise = (async () => {
      const semStart = performance.now();
      try {
        // Generate query embedding
        const queryVector = await getEmbeddingPipeline().embedQuery(trimmedQuery);
        // Search user vector space
        const results = this.retrieveSemantic(userId, queryVector, filters);
        vectorLatency = Math.round(performance.now() - semStart);
        return results;
      } catch (err) {
        console.warn('[SearchService] Semantic vector retrieval failed:', err);
        return [];
      }
    })();

    const [lexicalCandidates, semanticCandidates] = await Promise.all([lexicalPromise, semanticPromise]);

    // 3. Graceful degradation check
    if (semanticCandidates.length === 0 && lexicalCandidates.length > 0) {
      mode = 'lexical';
    } else if (lexicalCandidates.length === 0 && semanticCandidates.length > 0) {
      mode = 'semantic';
    }

    // 4. Reciprocal Rank Fusion (RRF)
    // Formula: RRF(d) = sum_{m in models} 1 / (k + rank_m(d))
    // Standard k = 60
    const K = 60;
    const scoresMap = new Map<
      string,
      {
        item: Bookmark;
        rrfScore: number;
        lexicalRank?: number;
        semanticRank?: number;
        semanticSimilarity?: number;
        exactBoost: number;
      }
    >();

    // Index lexical candidates
    lexicalCandidates.forEach((cand, index) => {
      const rank = index + 1;
      const existing = scoresMap.get(cand.item.id);
      const exactBoost = cand.exactMatch ? 0.35 : 0;
      if (existing) {
        existing.rrfScore += 1 / (K + rank);
        existing.lexicalRank = rank;
        existing.exactBoost = Math.max(existing.exactBoost, exactBoost);
      } else {
        scoresMap.set(cand.item.id, {
          item: cand.item,
          rrfScore: 1 / (K + rank),
          lexicalRank: rank,
          exactBoost,
        });
      }
    });

    // Index semantic candidates
    semanticCandidates.forEach((cand, index) => {
      const rank = index + 1;
      const existing = scoresMap.get(cand.item.id);
      if (existing) {
        existing.rrfScore += 1 / (K + rank);
        existing.semanticRank = rank;
        existing.semanticSimilarity = cand.similarity;
      } else {
        scoresMap.set(cand.item.id, {
          item: cand.item,
          rrfScore: 1 / (K + rank),
          semanticRank: rank,
          semanticSimilarity: cand.similarity,
          exactBoost: 0,
        });
      }
    });

    // 5. Compute combined final score with exact match boosting
    const fusedResults: SearchResultItem[] = Array.from(scoresMap.values()).map((entry) => {
      const hasLexical = entry.lexicalRank !== undefined;
      const hasSemantic = entry.semanticRank !== undefined;

      let matchType: 'lexical' | 'semantic' | 'hybrid' = 'hybrid';
      if (hasLexical && !hasSemantic) matchType = 'lexical';
      else if (!hasLexical && hasSemantic) matchType = 'semantic';

      // Combined score: normalized RRF score + exact boost
      const finalScore = entry.rrfScore + entry.exactBoost;

      return {
        item: entry.item,
        score: Number(finalScore.toFixed(4)),
        matchType,
      };
    });

    // Sort descending by score
    fusedResults.sort((a, b) => b.score - a.score);

    const total = fusedResults.length;
    const paginatedResults = fusedResults.slice(offset, offset + limit);
    const totalLatency = Math.round(performance.now() - startTime);

    return {
      query: trimmedQuery,
      results: paginatedResults,
      total,
      mode,
      latencyMs: totalLatency,
    };
  }

  /**
   * Retrieves high-quality lexical candidates using full-text and token matching.
   */
  private static retrieveLexical(
    userId: string,
    rawQuery: string,
    normQuery: string,
    queryWords: string[],
    filters?: SearchFilters
  ): { item: Bookmark; score: number; exactMatch: boolean }[] {
    const userBookmarks = store.getBookmarks(userId);
    const filtered = this.applyFilters(userBookmarks, filters);

    const scored: { item: Bookmark; score: number; exactMatch: boolean }[] = [];

    for (const item of filtered) {
      let score = 0;
      let exactMatch = false;

      const content = (item.content || '').toLowerCase();
      const author = (item.author_name || '').toLowerCase();
      const username = (item.author_username || '').toLowerCase();
      const summary = (item.ai_summary || '').toLowerCase();
      const insight = (item.why_saved_insight || '').toLowerCase();
      const topics = (item.topics || []).map((t) => t.toLowerCase());
      const keywords = (item.keywords || []).map((k) => k.toLowerCase());

      // Exact phrase match in content, author, or summary
      if (content.includes(normQuery)) {
        score += 30;
        exactMatch = true;
      }
      if (summary.includes(normQuery)) {
        score += 25;
        exactMatch = true;
      }
      if (author === normQuery || username === normQuery.replace('@', '')) {
        score += 40;
        exactMatch = true;
      } else if (author.includes(normQuery) || username.includes(normQuery)) {
        score += 20;
      }

      // Keyword / Topic exact hits
      if (topics.some((t) => t === normQuery || t.includes(normQuery))) {
        score += 15;
      }
      if (keywords.some((k) => k === normQuery || k.includes(normQuery))) {
        score += 15;
      }

      // Individual token matches
      let matchedWords = 0;
      for (const word of queryWords) {
        if (word.length <= 1) continue;
        let wordScore = 0;

        if (author.includes(word) || username.includes(word)) wordScore += 8;
        if (keywords.some((k) => k.includes(word))) wordScore += 6;
        if (topics.some((t) => t.includes(word))) wordScore += 5;
        if (summary.includes(word)) wordScore += 4;
        if (insight.includes(word)) wordScore += 3;
        if (content.includes(word)) wordScore += 2;

        if (wordScore > 0) {
          matchedWords++;
          score += wordScore;
        }
      }

      // Bonus if all query words match
      if (queryWords.length > 1 && matchedWords === queryWords.length) {
        score += 10;
      }

      if (score > 0) {
        scored.push({ item, score, exactMatch });
      }
    }

    // Sort candidates descending by lexical score
    scored.sort((a, b) => b.score - a.score);

    // Return top 50 lexical candidates
    return scored.slice(0, 50);
  }

  /**
   * Retrieves semantic vector candidates by computing cosine similarity
   * over the authenticated user's stored embeddings.
   * Strict user isolation: only examines embeddings where embedding.userId === userId.
   */
  private static retrieveSemantic(
    userId: string,
    queryVector: number[],
    filters?: SearchFilters
  ): { item: Bookmark; similarity: number }[] {
    // Strictly retrieve embeddings belonging ONLY to this user
    const userEmbeddings = store.getAllEmbeddings(userId);
    if (userEmbeddings.length === 0) {
      return [];
    }

    const userBookmarks = store.getBookmarks(userId);
    const bookmarksMap = new Map<string, Bookmark>();
    for (const b of userBookmarks) {
      bookmarksMap.set(b.id, b);
    }

    const candidates: { item: Bookmark; similarity: number }[] = [];
    const SIMILARITY_THRESHOLD = 0.28; // Meaningful semantic threshold

    for (const emb of userEmbeddings) {
      const item = bookmarksMap.get(emb.savedItemId);
      if (!item) continue;

      // Filter check
      if (!this.matchesFilters(item, filters)) continue;

      const similarity = cosineSimilarity(queryVector, emb.embedding);
      if (similarity >= SIMILARITY_THRESHOLD) {
        candidates.push({
          item,
          similarity: Number(similarity.toFixed(4)),
        });
      }
    }

    // Sort descending by semantic similarity
    candidates.sort((a, b) => b.similarity - a.similarity);

    // Return top 40 semantic candidates
    return candidates.slice(0, 40);
  }

  /**
   * Finds related bookmarks using dense vector cosine similarity.
   * Strictly user-isolated: excludes current bookmark and other users.
   */
  public static getRelatedBookmarks(options: RelatedBookmarksOptions): {
    bookmark: Bookmark;
    similarity: number;
  }[] {
    const { userId, savedItemId, limit = 5, minSimilarity = 0.32 } = options;

    const targetEmbedding = store.getEmbedding(savedItemId);
    if (!targetEmbedding || !targetEmbedding.embedding || targetEmbedding.userId !== userId) {
      // Fallback: If target has no vector yet, match by shared topics & keywords
      return this.getFallbackRelated(userId, savedItemId, limit);
    }

    const allUserEmbeddings = store.getAllEmbeddings(userId);
    const userBookmarks = store.getBookmarks(userId);
    const bookmarksMap = new Map<string, Bookmark>();
    for (const b of userBookmarks) {
      bookmarksMap.set(b.id, b);
    }

    const scored: { bookmark: Bookmark; similarity: number }[] = [];

    for (const emb of allUserEmbeddings) {
      if (emb.savedItemId === savedItemId) continue; // Exclude self
      const b = bookmarksMap.get(emb.savedItemId);
      if (!b) continue;

      const sim = cosineSimilarity(targetEmbedding.embedding, emb.embedding);
      if (sim >= minSimilarity) {
        scored.push({
          bookmark: b,
          similarity: Number(sim.toFixed(4)),
        });
      }
    }

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);

    const results = scored.slice(0, limit);

    // If fewer than 2 vector matches found, supplement with topic overlap
    if (results.length < 2) {
      const fallback = this.getFallbackRelated(userId, savedItemId, limit - results.length, new Set(results.map(r => r.bookmark.id)));
      for (const fb of fallback) {
        results.push(fb);
      }
    }

    return results;
  }

  /**
   * Fallback related items matcher using topic/keyword intersection when embeddings are still generating.
   */
  private static getFallbackRelated(
    userId: string,
    savedItemId: string,
    limit = 5,
    excludeIds = new Set<string>()
  ): { bookmark: Bookmark; similarity: number }[] {
    const target = store.getBookmarkById(savedItemId);
    if (!target) return [];

    const userBookmarks = store.getBookmarks(userId);
    const scored: { bookmark: Bookmark; similarity: number }[] = [];

    const targetTopics = new Set((target.topics || []).map((t) => t.toLowerCase()));
    const targetKeywords = new Set((target.keywords || []).map((k) => k.toLowerCase()));

    for (const b of userBookmarks) {
      if (b.id === savedItemId || excludeIds.has(b.id)) continue;

      let overlap = 0;
      for (const t of b.topics || []) {
        if (targetTopics.has(t.toLowerCase())) overlap += 2;
      }
      for (const k of b.keywords || []) {
        if (targetKeywords.has(k.toLowerCase())) overlap += 1;
      }

      if (overlap > 0) {
        scored.push({
          bookmark: b,
          similarity: Math.min(0.45, 0.2 + overlap * 0.05),
        });
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  /**
   * Applies metadata filters to an array of bookmarks.
   */
  public static applyFilters(bookmarks: Bookmark[], filters?: SearchFilters): Bookmark[] {
    if (!filters) return bookmarks;
    return bookmarks.filter((b) => this.matchesFilters(b, filters));
  }

  /**
   * Checks if a single bookmark matches filter criteria.
   */
  private static matchesFilters(b: Bookmark, filters?: SearchFilters): boolean {
    if (!filters) return true;

    // Filter by topic
    if (filters.topic && filters.topic !== 'all') {
      const normFilterTopic = filters.topic.toLowerCase();
      const hasTopic = (b.topics || []).some((t) => t.toLowerCase() === normFilterTopic);
      if (!hasTopic) return false;
    }

    // Filter by source
    if (filters.source && filters.source !== 'all') {
      if (b.source !== filters.source) return false;
    }

    // Filter by read/unread / favorite tabs
    if (filters.filter) {
      if (filters.filter === 'unread' && b.is_read) return false;
      if (filters.filter === 'favorites' && !b.is_favorite) return false;
    }

    if (filters.isRead !== undefined && b.is_read !== filters.isRead) {
      return false;
    }

    if (filters.isFavorite !== undefined && b.is_favorite !== filters.isFavorite) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromTime = new Date(filters.dateFrom).getTime();
      const itemTime = new Date(b.bookmark_created_at || b.imported_at || 0).getTime();
      if (itemTime < fromTime) return false;
    }

    if (filters.dateTo) {
      const toTime = new Date(filters.dateTo).getTime();
      const itemTime = new Date(b.bookmark_created_at || b.imported_at || 0).getTime();
      if (itemTime > toTime) return false;
    }

    // Scoped collection filter
    if (filters.collectionId) {
      const directMatch = (b.collection_ids || []).includes(filters.collectionId);
      if (!directMatch) {
        const col = store.getCollections().find((c) => c.id === filters.collectionId || c.slug === filters.collectionId);
        if (!col || !col.bookmark_ids.includes(b.id)) return false;
      }
    }

    // Scoped bookmark ID list filter (e.g. asking on a specific bookmark or selection)
    if (filters.bookmarkIds && filters.bookmarkIds.length > 0) {
      if (!filters.bookmarkIds.includes(b.id)) return false;
    }

    // Scoped author filter
    if (filters.author) {
      const targetAuthor = filters.author.toLowerCase().replace('@', '');
      const hasAuthor = (b.author_username || '').toLowerCase().includes(targetAuthor) ||
                        (b.author_name || '').toLowerCase().includes(targetAuthor);
      if (!hasAuthor) return false;
    }

    return true;
  }
}
