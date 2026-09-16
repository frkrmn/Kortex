-- Recallly: Development Seed Data
-- supabase/seed.sql
-- Fixed demo user ID for deterministic local and testing environments
-- (Does NOT contain fake OAuth secrets or payment credentials)

DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_item_1 UUID := '10000000-0000-0000-0000-000000000101'::uuid;
  v_item_2 UUID := '10000000-0000-0000-0000-000000000102'::uuid;
  v_item_3 UUID := '10000000-0000-0000-0000-000000000103'::uuid;
  v_item_4 UUID := '10000000-0000-0000-0000-000000000104'::uuid;
  v_item_5 UUID := '10000000-0000-0000-0000-000000000105'::uuid;

  v_topic_ai UUID := '20000000-0000-0000-0000-000000000001'::uuid;
  v_topic_product UUID := '20000000-0000-0000-0000-000000000002'::uuid;
  v_topic_startups UUID := '20000000-0000-0000-0000-000000000003'::uuid;
  v_topic_design UUID := '20000000-0000-0000-0000-000000000004'::uuid;

  v_col_ai UUID := '30000000-0000-0000-0000-000000000001'::uuid;
  v_col_startups UUID := '30000000-0000-0000-0000-000000000002'::uuid;
  v_col_design UUID := '30000000-0000-0000-0000-000000000003'::uuid;

  v_thread_id UUID := '40000000-0000-0000-0000-000000000001'::uuid;
  v_digest_id UUID := '50000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- 1. PROFILES
  INSERT INTO profiles (id, user_id, display_name, avatar_url, timezone, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_user_id,
    'Faruk',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'America/New_York',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. CONNECTED ACCOUNTS (Placeholder architecture only, no tokens)
  INSERT INTO connected_accounts (
    user_id, provider, username, sync_status, last_sync_at, last_successful_sync_at, metadata
  ) VALUES (
    v_user_id,
    'x',
    'faruk',
    'idle',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours',
    '{"platform": "x", "account_label": "@faruk"}'::jsonb
  )
  ON CONFLICT (user_id, provider) DO NOTHING;

  -- 3. TOPICS
  INSERT INTO topics (id, user_id, name, slug)
  VALUES
    (v_topic_ai, v_user_id, 'AI', 'ai'),
    (v_topic_product, v_user_id, 'Product', 'product'),
    (v_topic_startups, v_user_id, 'Startups', 'startups'),
    (v_topic_design, v_user_id, 'Design', 'design')
  ON CONFLICT (user_id, slug) DO NOTHING;

  -- 4. SAVED ITEMS (Multi-source schema)
  INSERT INTO saved_items (
    id, user_id, source, external_id, content, url, author_id, author_name, author_username,
    author_avatar_url, media, published_at, saved_at, imported_at, summary, language, is_read, is_favorite, metadata
  ) VALUES
    (
      v_item_1,
      v_user_id,
      'x',
      '1789012345678901201',
      'A mental model for the "LLM OS":\n- CPU: LLM (orchestrates reasoning)\n- RAM: Context window (fast working memory)\n- Disk: Vector database & file system (persistent retrieval)\n- Bus: System prompts & API protocols\n- Peripherals: Tools, web browsers, compilers\n\nWe are building an entirely new computing platform layer.',
      'https://x.com/karpathy/status/1789012345678901201',
      'karpathy',
      'Andrej Karpathy',
      'karpathy',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      '[{"type": "image", "url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"}]'::jsonb,
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days',
      'Framing modern LLM architectures as an operating system where the model acts as the CPU, context window as RAM, and external vector stores as disk storage.',
      'en',
      FALSE,
      TRUE,
      '{"likes": 38400, "retweets": 6200, "replies": 940, "why_saved_insight": "Foundational mental model for designing autonomous AI agent systems with structured memory."}'::jsonb
    ),
    (
      v_item_2,
      v_user_id,
      'x',
      '1789012345678901202',
      'Four agentic design patterns that drive dramatic accuracy jumps over zero-shot prompting:\n1. Reflection (self-critique before outputting)\n2. Tool use (code execution, search, APIs)\n3. Planning (multi-step decomposition)\n4. Multi-agent collaboration (specialized roles)\n\nIterative agent workflows with smaller models often beat single prompts on frontier models.',
      'https://x.com/AndrewYNg/status/1789012345678901202',
      'AndrewYNg',
      'Andrew Ng',
      'AndrewYNg',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      '[]'::jsonb,
      NOW() - INTERVAL '4 days',
      NOW() - INTERVAL '4 days',
      NOW() - INTERVAL '4 days',
      'Detailed taxonomy of four core agentic design patterns: reflection, tool use, planning, and multi-agent collaboration.',
      'en',
      FALSE,
      TRUE,
      '{"likes": 21900, "retweets": 4300, "replies": 520, "why_saved_insight": "Practical blueprint for architecting resilient multi-agent software pipelines without over-relying on frontier model size."}'::jsonb
    ),
    (
      v_item_3,
      v_user_id,
      'x',
      '1789012345678901203',
      'Designing great consumer software is about removing the friction between user intent and magical realization. If your user has to read instructions or navigate more than two nested screens to feel value, the product has already failed the empathy test.',
      'https://x.com/bchesky/status/1789012345678901203',
      'bchesky',
      'Brian Chesky',
      'bchesky',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      '[]'::jsonb,
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days',
      'Insight on removing friction between user intent and realizing value immediately within first touchpoints.',
      'en',
      TRUE,
      FALSE,
      '{"likes": 15400, "retweets": 2800, "replies": 390, "why_saved_insight": "Reminder on rapid activation and removing bureaucratic product barriers."}'::jsonb
    ),
    (
      v_item_4,
      v_user_id,
      'x',
      '1789012345678901205',
      'The most important trait in early-stage founders is relentless resourcefulness. Smart people are common; people who refuse to stop when normal obstacles appear are remarkably rare.',
      'https://x.com/paulg/status/1789012345678901205',
      'paulg',
      'Paul Graham',
      'paulg',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      '[]'::jsonb,
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '7 days',
      'Paul Graham argues that relentless resourcefulness is the single most critical differentiator in early-stage founders.',
      'en',
      TRUE,
      TRUE,
      '{"likes": 42100, "retweets": 8100, "replies": 1200, "why_saved_insight": "Core philosophy on grit, high-agency execution, and overcoming structural inertia."}'::jsonb
    ),
    (
      v_item_5,
      v_user_id,
      'x',
      '1789012345678901206',
      'Building in public with extreme simplicity: 1 server, vanilla PHP, SQLite database, 0 dependencies. Generates $3M/year. Stop over-engineering before you have customers who care.',
      'https://x.com/levelsio/status/1789012345678901206',
      'levelsio',
      'Pieter Levels',
      'levelsio',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      '[]'::jsonb,
      NOW() - INTERVAL '8 days',
      NOW() - INTERVAL '8 days',
      NOW() - INTERVAL '8 days',
      'Radical simplicity in application infrastructure: running solo bootstrapped software with zero dependencies and monolithic architecture.',
      'en',
      FALSE,
      TRUE,
      '{"likes": 56000, "retweets": 9400, "replies": 1850, "why_saved_insight": "Anti-complexity manifesto for indie developers and solo hackers."}'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

  -- 5. SAVED ITEM TOPICS LINKAGES
  INSERT INTO saved_item_topics (saved_item_id, topic_id, confidence)
  VALUES
    (v_item_1, v_topic_ai, 1.0),
    (v_item_2, v_topic_ai, 1.0),
    (v_item_3, v_topic_design, 1.0),
    (v_item_3, v_topic_product, 0.9),
    (v_item_4, v_topic_startups, 1.0),
    (v_item_5, v_topic_startups, 0.95)
  ON CONFLICT (saved_item_id, topic_id) DO NOTHING;

  -- 6. COLLECTIONS
  INSERT INTO collections (id, user_id, name, slug, description, visibility, created_at, updated_at)
  VALUES
    (
      v_col_ai,
      v_user_id,
      'AI Research',
      'ai-research',
      'Research, tools and ideas about artificial intelligence, agentic architectures, and evaluation systems.',
      'public',
      NOW() - INTERVAL '30 days',
      NOW() - INTERVAL '2 days'
    ),
    (
      v_col_startups,
      v_user_id,
      'Startup Ideas',
      'startup-ideas',
      'Interesting business ideas, opportunities, solo bootstrapping models, and founder psychology.',
      'private',
      NOW() - INTERVAL '45 days',
      NOW() - INTERVAL '5 days'
    ),
    (
      v_col_design,
      v_user_id,
      'Design Inspiration',
      'design-inspiration',
      'Curated perspectives on design tokens, typography, craftsmanship, and developer-designer empathy.',
      'public',
      NOW() - INTERVAL '20 days',
      NOW() - INTERVAL '10 days'
    )
  ON CONFLICT (user_id, slug) DO NOTHING;

  -- 7. COLLECTION ITEMS
  INSERT INTO collection_items (collection_id, saved_item_id, position)
  VALUES
    (v_col_ai, v_item_1, 0),
    (v_col_ai, v_item_2, 1),
    (v_col_startups, v_item_4, 0),
    (v_col_startups, v_item_5, 1),
    (v_col_design, v_item_3, 0)
  ON CONFLICT (collection_id, saved_item_id) DO NOTHING;

  -- 8. DIGEST SETTINGS
  INSERT INTO digest_settings (user_id, frequency, delivery_day, delivery_time, timezone, enabled)
  VALUES (
    v_user_id,
    'weekly',
    1, -- Monday
    '09:00:00',
    'America/New_York',
    TRUE
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 9. DIGESTS
  INSERT INTO digests (
    id, user_id, period_start, period_end, status, title, summary, content, sent_at, created_at
  ) VALUES (
    v_digest_id,
    v_user_id,
    NOW() - INTERVAL '7 days',
    NOW(),
    'sent',
    'Your Week in Bookmarks',
    'Deep dive into LLM operating systems, evaluation harnesses, and iterative agent loops.',
    '{
      "bookmarks_count": 42,
      "topics_count": 7,
      "key_ideas": [
        "Agent infrastructure is standardizing around memory and tool-calling loops.",
        "Instant activation within 3 minutes dictates long-term user retention.",
        "Radical simplicity in stack design unlocks 10x shipping velocity."
      ]
    }'::jsonb,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 10. CHAT THREADS & MESSAGES
  INSERT INTO chat_threads (id, user_id, title, created_at, updated_at)
  VALUES (
    v_thread_id,
    v_user_id,
    'AI Agents & LLM OS Exploration',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO chat_messages (thread_id, user_id, role, content, sources, created_at)
  VALUES
    (
      v_thread_id,
      v_user_id,
      'user',
      'What have I saved about AI agents?',
      '[]'::jsonb,
      NOW() - INTERVAL '2 days'
    ),
    (
      v_thread_id,
      v_user_id,
      'assistant',
      'Across your bookmarks regarding AI agents, two foundational themes emerge:\n\n1. **The Four Agentic Patterns**: Andrew Ng emphasizes that reflection, tool use, planning, and multi-agent collaboration consistently yield higher accuracy than zero-shot prompts.\n\n2. **The LLM OS Abstraction**: Andrej Karpathy frames agent systems as a modern computing architecture where the LLM functions as a central CPU and vector retrieval acts as disk storage.',
      '["10000000-0000-0000-0000-000000000101", "10000000-0000-0000-0000-000000000102"]'::jsonb,
      NOW() - INTERVAL '2 days' + INTERVAL '5 seconds'
    );

  -- 11. SUBSCRIPTION (Architecture placeholder)
  INSERT INTO subscriptions (
    user_id, provider, plan, status, current_period_end
  ) VALUES (
    v_user_id,
    'stripe',
    'free_trial',
    'trialing',
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

END $$;
