export interface DemoAskResponse {
  answer: string;
  sourceBookmarkIds: string[];
}

export const demoSuggestedPrompts: string[] = [
  'What have I saved about AI agents?',
  'Show me the best startup ideas I\'ve bookmarked.',
  'What have I saved about product design & onboarding?',
  'What have I saved about simple tech stacks?',
];

export const demoAnswers: Record<string, DemoAskResponse> = {
  default: {
    answer: `Based on your saved library of 2,847 bookmarks, here are the key themes and perspectives:

1. **Agentic System Architecture**: Rather than relying strictly on frontier model size, high-performing systems use iterative workflows decomposed into reflection, tool calling, planning, and multi-agent coordination (Andrew Ng). Karpathy outlines this as the emerging "LLM OS" with model as CPU, context window as RAM, and vector databases as disk.

2. **Evaluation Over Prompting**: Harrison Chase highlights that 90% of autonomous agent engineering is building an automated test harness to measure tool regressions, serving as the unit tests of AI software.

3. **Production Implementation**: Shawn Wang points out that the modern AI engineer bridges probabilistic LLM reasoning with deterministic code, evals, and low-latency streaming UX.`,
    sourceBookmarkIds: ['bm_101', 'bm_102', 'bm_104', 'bm_110'],
  },
  ai_agents: {
    answer: `Across your bookmarks regarding AI agents, three foundational themes emerge:

• **The Four Agentic Patterns**: Andrew Ng emphasizes that reflection (self-critique before generating output), tool use (APIs, code interpreters), planning (multi-step task decomposition), and multi-agent collaboration consistently yield higher accuracy than single zero-shot prompts.

• **The LLM OS Abstraction**: Andrej Karpathy frames agent systems as a modern computing architecture where the LLM functions as a central reasoning CPU, the prompt context acts as fast volatile RAM, and vector retrieval stores act as non-volatile disk.

• **Continuous Regression Evals**: Harrison Chase stresses that reliable agent production depends on automated test harnesses measuring tool-call consistency against golden datasets, rather than manual prompt tweaking.`,
    sourceBookmarkIds: ['bm_101', 'bm_102', 'bm_104', 'bm_110'],
  },
  startup_ideas: {
    answer: `Here are the core principles from the startup founders and investors in your library:

• **Relentless Resourcefulness**: Paul Graham identifies this as the single most critical founder trait—treating obstacles not as dead ends, but as problems that must have a path over, under, or around them.

• **High Agency Execution**: Shreyas Doshi frames high agency as approaching rules, constraints, and standard procedures as flexible variables: asking "What would have to be true for this to work anyway?"

• **Radical Stack Simplicity**: Pieter Levels demonstrates generating $3M/year with single PHP files, SQLite, and vanilla JS, proving that avoiding premature infrastructure complexity maximizes margin and shipping speed.`,
    sourceBookmarkIds: ['bm_105', 'bm_106', 'bm_111'],
  },
  product_design: {
    answer: `Your saved product and design bookmarks focus heavily on craftsmanship and immediate time-to-value:

• **3-5 Minute Onboarding Rule**: Lenny Rachitsky highlights that if users do not experience their core aha moment within 3-5 minutes, over 80% abandon the product. Skip lengthy walkthroughs and drop them directly into live data.

• **Craftsmanship Over Bureaucracy**: Brian Chesky restructured Airbnb to remove layers between product managers and designers, having engineers and designers collaborate directly with deep attention to detail.

• **Semantic Design Tokens**: Dylan Field points out that treating design tokens as semantic contracts between code and design ensures visual coherence and effortless accessibility.`,
    sourceBookmarkIds: ['bm_103', 'bm_107', 'bm_109'],
  },
  tech_stacks: {
    answer: `Your bookmarks show a recurring preference for operational simplicity and pragmatism:

• **The Solo Stack**: Pieter Levels advocates for monolithic PHP/JS/SQLite stacks running on basic VPS servers, emphasizing cash flow over architectural fashion.

• **Pragmatic Caching**: Alex Xu breaks down Cache-Aside vs Write-Back patterns for scaling read-heavy applications without distributed microservice overhead.

• **The LLM OS**: Karpathy shows how modern applications interface with local and cloud memory hierarchies.`,
    sourceBookmarkIds: ['bm_106', 'bm_108', 'bm_101'],
  },
};

export function getDemoAnswerForQuery(query: string): DemoAskResponse {
  const q = query.toLowerCase();
  if (q.includes('agent') || q.includes('ai') || q.includes('llm')) {
    return demoAnswers.ai_agents;
  }
  if (q.includes('startup') || q.includes('idea') || q.includes('founder') || q.includes('agency')) {
    return demoAnswers.startup_ideas;
  }
  if (q.includes('product') || q.includes('design') || q.includes('onboard') || q.includes('craft')) {
    return demoAnswers.product_design;
  }
  if (q.includes('stack') || q.includes('sqlite') || q.includes('simple') || q.includes('code')) {
    return demoAnswers.tech_stacks;
  }
  return demoAnswers.default;
}
