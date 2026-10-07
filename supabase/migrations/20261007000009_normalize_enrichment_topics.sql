-- GRM-135: deterministically normalize only production-audited topic aliases.
-- This changes topic arrays only; enrichment ownership, IDs, categories,
-- summaries, key concepts, and source content are untouched.
WITH normalized AS (
  SELECT enrichment.id,
    COALESCE((
      SELECT array_agg(deduped.canonical ORDER BY deduped.first_ordinal)
      FROM (
        SELECT lower(mapped.canonical) AS canonical_key,
          min(mapped.canonical) AS canonical,
          min(mapped.ordinality) AS first_ordinal
        FROM (
          SELECT topic.ordinality,
            CASE regexp_replace(lower(regexp_replace(btrim(topic.raw_topic), '[.,;:]+$', '')), '\s+', ' ', 'g')
              WHEN 'ai' THEN 'AI'
              WHEN 'artificial intelligence' THEN 'AI'
              WHEN 'book recommendation' THEN 'Book Recommendation'
              WHEN 'book recommendations' THEN 'Book Recommendation'
              WHEN 'open source' THEN 'Open Source'
              WHEN 'open source software' THEN 'Open Source'
              WHEN 'open-source software' THEN 'Open Source'
              WHEN 'prompt engineering' THEN 'Prompt Engineering'
              WHEN 'trading indicators' THEN 'Trading Indicators'
              WHEN 'ai video generation' THEN 'AI Video Generation'
              WHEN 'market analysis' THEN 'Market Analysis'
              WHEN 'vibe coding' THEN 'Vibe Coding'
              WHEN 'ai coding agents' THEN 'AI Coding Agents'
              WHEN 'app monetization' THEN 'App Monetization'
              WHEN 'film recommendations' THEN 'Film Recommendations'
              WHEN 'market research' THEN 'Market Research'
              WHEN 'digital products' THEN 'Digital Products'
              WHEN 'etsy selling' THEN 'Etsy Selling'
              WHEN 'software testing' THEN 'Software Testing'
              WHEN 'trading strategy' THEN 'Trading Strategy'
              WHEN 'trading strategies' THEN 'Trading Strategy'
              WHEN 'github repository' THEN 'GitHub Repository'
              WHEN 'github repositories' THEN 'GitHub Repository'
              WHEN 'workflow' THEN 'Workflow'
              WHEN 'workflows' THEN 'Workflow'
              WHEN 'investment strategy' THEN 'Investment Strategy'
              WHEN 'investment strategies' THEN 'Investment Strategy'
              ELSE regexp_replace(regexp_replace(btrim(topic.raw_topic), '[.,;:]+$', ''), '\s+', ' ', 'g')
            END AS canonical
          FROM unnest(enrichment.topics) WITH ORDINALITY AS topic(raw_topic, ordinality)
        ) mapped
        WHERE mapped.canonical <> ''
        GROUP BY lower(mapped.canonical)
      ) deduped
    ), '{}'::text[]) AS topics
  FROM public.saved_item_enrichments enrichment
), changed AS (
  SELECT enrichment.id, normalized.topics
  FROM public.saved_item_enrichments enrichment
  JOIN normalized USING (id)
  WHERE enrichment.topics IS DISTINCT FROM normalized.topics
)
UPDATE public.saved_item_enrichments enrichment
SET topics = changed.topics
FROM changed
WHERE enrichment.id = changed.id;
