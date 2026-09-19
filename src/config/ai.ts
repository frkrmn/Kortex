export interface AIConfig {
  provider: 'gemini' | 'openai';
  enrichmentModel: string;
  embeddingModel: string;
  embeddingDimension: number;
  embeddingBatchSize: number;
  embeddingConcurrency: number;
  embeddingVersion: string;
  temperature: number;
  maxRetries: number;
  batchSize: number;
  concurrency: number;
  version: string;
  confidenceThreshold: number;
  maxContentLength: number;
  ragModel: string;
  ragTemperature: number;
  ragMaxSources: number;
  ragSufficiencyThreshold: number;
  ragMaxContextTokens: number;
}

export function getAIConfig(): AIConfig {
  const providerEnv = (process.env.AI_PROVIDER || '').toLowerCase();
  const provider = (providerEnv === 'openai' || (!process.env.GEMINI_API_KEY && process.env.OPENAI_API_KEY))
    ? 'openai'
    : 'gemini';

  const defaultGeminiModel = 'gemini-3.8-flash';
  const defaultOpenAIModel = 'gpt-4o-mini';

  const defaultGeminiEmbeddingModel = 'text-embedding-004';
  const defaultOpenAIEmbeddingModel = 'text-embedding-3-small';

  const embeddingModel = process.env.AI_EMBEDDING_MODEL || (
    provider === 'gemini' ? defaultGeminiEmbeddingModel : defaultOpenAIEmbeddingModel
  );

  // Gemini text-embedding-004 produces 768 dimensions; OpenAI text-embedding-3-small produces 1536
  const embeddingDimension = embeddingModel.includes('text-embedding-004') ? 768 : 1536;

  return {
    provider,
    enrichmentModel: provider === 'gemini'
      ? (process.env.GEMINI_ENRICHMENT_MODEL || defaultGeminiModel)
      : (process.env.OPENAI_ENRICHMENT_MODEL || defaultOpenAIModel),
    embeddingModel,
    embeddingDimension,
    embeddingBatchSize: parseInt(process.env.AI_EMBEDDING_BATCH_SIZE || '10', 10),
    embeddingConcurrency: parseInt(process.env.AI_EMBEDDING_CONCURRENCY || '2', 10),
    embeddingVersion: 'v1.0',
    temperature: 0.2,
    maxRetries: 3,
    batchSize: 5,
    concurrency: 3,
    version: 'v1.0',
    confidenceThreshold: 0.70,
    maxContentLength: 4000,
    ragModel: provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini',
    ragTemperature: 0.2,
    ragMaxSources: 8,
    ragSufficiencyThreshold: 0.22,
    ragMaxContextTokens: 3500,
  };
}

export const aiConfig = getAIConfig();
