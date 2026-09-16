import { IAIProvider, EnrichmentInput, EnrichmentResult, EnrichmentError, TopicSuggestion, EmbeddingProvider, EmbeddingResult } from "./types";
import { aiConfig } from "../../src/config/ai";
import { SYSTEM_ENRICHMENT_PROMPT, buildEnrichmentUserPrompt } from "./prompt";
import { normalizeKeywords, normalizeTopicName } from "./topic-normalizer";
import { generateDeterministicVector } from "./vector-math";

export class OpenAIProvider implements IAIProvider, EmbeddingProvider {
  name = "openai";

  async enrichSavedItem(input: EnrichmentInput): Promise<EnrichmentResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = aiConfig.enrichmentModel || process.env.OPENAI_ENRICHMENT_MODEL || "gpt-4o-mini";

    if (apiKey) {
      try {
        const userPrompt = buildEnrichmentUserPrompt(input);

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: aiConfig.temperature,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_ENRICHMENT_PROMPT },
              { role: "user", content: userPrompt },
            ],
          }),
        });

        if (response.status === 429) {
          throw new EnrichmentError("OpenAI rate limit exceeded", "AI_RATE_LIMITED", true);
        }

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new EnrichmentError(`OpenAI API error (${response.status}): ${errBody}`, "AI_PROVIDER_ERROR", response.status >= 500);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new EnrichmentError("Empty content from OpenAI", "AI_INVALID_RESPONSE", true);
        }

        const parsed = JSON.parse(content);
        const language = typeof parsed.language === 'string' ? parsed.language.trim().toLowerCase().slice(0, 2) : 'en';
        const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : input.content.slice(0, 160) + '...';
        const keywords = normalizeKeywords(Array.isArray(parsed.keywords) ? parsed.keywords : []);

        const topics: TopicSuggestion[] = [];
        if (Array.isArray(parsed.topics)) {
          for (const item of parsed.topics) {
            if (typeof item === 'object' && item && typeof item.name === 'string') {
              const clean = normalizeTopicName(item.name);
              const conf = typeof item.confidence === 'number' ? item.confidence : 0.9;
              if (clean) topics.push({ name: clean, confidence: conf });
            }
          }
        }

        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const estimatedCost = (promptTokens * 0.00000015) + (completionTokens * 0.0000006);

        return {
          language,
          summary,
          keywords: keywords.length > 0 ? keywords : ['Research', 'Reference'],
          topics: topics.length > 0 ? topics : [{ name: 'Knowledge', confidence: 0.85 }],
          whySavedInsight: parsed.whySavedInsight || 'High-signal reference for future ideation.',
          tokenUsage: {
            inputTokens: promptTokens,
            outputTokens: completionTokens,
            model,
            provider: 'openai',
            estimatedCost: Number(estimatedCost.toFixed(6)),
          },
        };
      } catch (err: any) {
        if (err instanceof EnrichmentError) throw err;
        console.warn("OpenAI enrichment error, falling back to heuristic:", err);
      }
    }

    // Heuristic fallback
    return {
      language: 'en',
      summary: input.content.slice(0, 160) + '...',
      keywords: ['Reference', 'Insight'],
      topics: [{ name: 'Knowledge', confidence: 0.80 }],
      whySavedInsight: 'Saved for future reference.',
      tokenUsage: {
        inputTokens: Math.ceil(input.content.length / 4),
        outputTokens: 50,
        model: 'heuristic',
        provider: 'local',
        estimatedCost: 0,
      },
    };
  }

  async embedText(input: string): Promise<EmbeddingResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = aiConfig.embeddingModel || "text-embedding-3-small";
    const cleanInput = input.trim();

    if (apiKey && cleanInput) {
      try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            input: cleanInput,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const vec = data.data?.[0]?.embedding;
          if (Array.isArray(vec)) {
            return {
              embedding: vec,
              model,
              provider: "openai",
              tokensUsed: data.usage?.total_tokens || Math.ceil(cleanInput.length / 4),
            };
          }
        }
      } catch (err) {
        console.warn("[OpenAIProvider] Embedding failed:", err);
      }
    }

    return {
      embedding: generateDeterministicVector(cleanInput, aiConfig.embeddingDimension || 1536),
      model: "fallback-text-embedding-3-small",
      provider: "openai-local",
      tokensUsed: Math.ceil(cleanInput.length / 4),
    };
  }

  async embedBatch(inputs: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    for (const text of inputs) {
      results.push(await this.embedText(text));
    }
    return results;
  }
}
