export type BlogInlinePart = string | { label: string; href: string };

export type BlogBlock =
  | { type: 'paragraph'; parts: BlogInlinePart[] }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; title: string; text: string };

export type BlogFaq = { question: string; answer: string };

export type BlogArticle = {
  slug: string;
  title: string;
  seoTitle?: string;
  description: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  category: string;
  blocks: BlogBlock[];
  faq?: BlogFaq[];
  relatedSlugs: string[];
};

export const blogArticles: BlogArticle[] = [
  {
    slug: 'how-to-organize-x-bookmarks',
    title: 'How to organize your X bookmarks so they stay useful',
    description: 'A practical workflow for turning a growing collection of saved X posts into something you can revisit, search, and use.',
    author: 'Recallly Editorial',
    publishedAt: '2026-09-30',
    readingTime: '6 min read',
    category: 'Bookmark workflows',
    relatedSlugs: ['search-and-rediscover-x-bookmarks', 'ai-categorize-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['Saving a post is easy. Finding it again when you need the idea is the harder part. A useful bookmark system gives saved posts enough context to be searchable without turning every saved item into a manual filing project.'] },
      { type: 'heading', level: 2, text: 'Start with the reason you saved it' },
      { type: 'paragraph', parts: ['When you revisit a bookmark, the question is rarely “what was this URL?” It is usually “why did this seem useful?” Keep the original post, then add lightweight signals that answer that question: a category, a few specific topics, or a short note.'] },
      { type: 'list', items: ['A technique you want to try', 'A product or tool worth evaluating', 'A reference for a project', 'A perspective you want to compare later'] },
      { type: 'heading', level: 2, text: 'Use broad categories and specific topics' },
      { type: 'paragraph', parts: ['Categories work best as broad navigation: Engineering, Product, Business, or AI. Topics can then carry the detail, such as “user onboarding,” “MCP,” or “technical writing.” This keeps the top-level library stable while still making a focused slice discoverable.'] },
      { type: 'callout', title: 'A simple rule', text: 'Use one broad category and a small number of topics that would help your future self find the post.' },
      { type: 'heading', level: 2, text: 'Keep the original source visible' },
      { type: 'paragraph', parts: ['Your notes and labels should make the bookmark easier to use, not replace the source. Keep the post text, author, publication date, and canonical link together so you can read the original context when it matters.'] },
      { type: 'paragraph', parts: ['Recallly keeps the original saved item available in its Reader and preserves a link back to the source. You can ', { label: 'explore the public demo', href: '/demo' }, ' to see the reading flow without connecting an account.'] },
      { type: 'heading', level: 2, text: 'Review the system when you need something' },
      { type: 'paragraph', parts: ['A good bookmark system is tested by retrieval. Search for a topic you remember, filter by a broad category, and open the saved item in context. If the result is noisy, refine the topic vocabulary you use next time rather than building a deeper folder tree.'] },
      { type: 'heading', level: 2, text: 'The goal is useful rediscovery' },
      { type: 'paragraph', parts: ['Organization is a means to an end: returning to a saved idea at the right moment. Start with a small vocabulary, preserve source context, and let search and reading do most of the work.'] },
    ],
  },
  {
    slug: 'search-and-rediscover-x-bookmarks',
    title: 'How to search and rediscover saved X posts',
    description: 'A retrieval-first guide to finding the right saved post without scrolling through your entire bookmark history.',
    author: 'Recallly Editorial',
    publishedAt: '2026-09-30',
    readingTime: '5 min read',
    category: 'Rediscovery',
    relatedSlugs: ['how-to-organize-x-bookmarks', 'ai-categorize-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['A bookmark library becomes valuable when it answers a future question quickly. Search is the bridge between “I remember saving something about this” and the original post.'] },
      { type: 'heading', level: 2, text: 'Search for the idea, not only the author' },
      { type: 'paragraph', parts: ['Start with the concept you remember: “activation,” “vector database,” or “pricing page.” A useful library can search across saved text and metadata, so the words inside the post and its organization signals both help narrow the result.'] },
      { type: 'heading', level: 2, text: 'Use category and topic context' },
      { type: 'paragraph', parts: ['If a broad search returns too much, add context. Select a category such as Product, then use a topic such as onboarding or retention. The combination is more useful than a long list of nested folders because topics remain flexible metadata.'] },
      { type: 'list', items: ['Begin with one memorable phrase or concept.', 'Limit the search to a category when the result set is broad.', 'Use a topic to separate related ideas.', 'Open the Reader to recover the post’s full context and source link.'] },
      { type: 'heading', level: 2, text: 'Read the saved post in context' },
      { type: 'paragraph', parts: ['A search result is only useful if it helps you decide what to do next. Open the item, check the author and publication date, read the surrounding text, and follow the original source when you need more context.'] },
      { type: 'paragraph', parts: ['Recallly’s ', { label: 'Reader', href: '/demo' }, ' keeps saved content and the original source action separate, so rediscovery does not require leaving the library immediately.'] },
      { type: 'heading', level: 2, text: 'Make future retrieval easier' },
      { type: 'paragraph', parts: ['When you save a post, choose a category and a few topics that match the questions you may ask later. The best label is not the most precise one; it is the one that will help you recognize the post months from now.'] },
      { type: 'callout', title: 'Retrieval test', text: 'If you cannot describe the question that would lead you back to a bookmark, the bookmark probably needs a clearer topic or note.' },
    ],
  },
  {
    slug: 'ai-categorize-x-bookmarks',
    title: 'How AI can help categorize X bookmarks without replacing your judgment',
    description: 'What AI enrichment is good at in a bookmark library, where it can fail, and how to keep the original source in control.',
    author: 'Recallly Editorial',
    publishedAt: '2026-09-30',
    readingTime: '6 min read',
    category: 'AI bookmark organization',
    relatedSlugs: ['how-to-organize-x-bookmarks', 'search-and-rediscover-x-bookmarks'],
    faq: [
      { question: 'Can AI understand an image in a saved post?', answer: 'When an image is available through the stored bookmark metadata and the configured enrichment path supports multimodal input, the text and image can be processed together. Results still need human review.' },
      { question: 'Should AI categories replace manual organization?', answer: 'No. AI is useful for a first pass, but categories and topics should remain easy to review and refine as your library changes.' },
    ],
    blocks: [
      { type: 'paragraph', parts: ['Manual organization does not scale well when saving is effortless. AI enrichment can provide a useful first pass by summarizing a post, suggesting one broad category, and extracting a few topics or concepts.'] },
      { type: 'heading', level: 2, text: 'Where AI enrichment helps' },
      { type: 'paragraph', parts: ['The strongest use is reducing the blank-page problem after saving. A concise summary can preserve why a post matters, while topics make a library easier to filter. This is especially helpful when the saved post is long, technical, or has useful visual context.'] },
      { type: 'heading', level: 2, text: 'Keep the taxonomy simple' },
      { type: 'paragraph', parts: ['One primary category is enough for navigation. Flexible topics can hold the nuance. A simple model is easier to understand, easier to search, and less likely to force a post into an arbitrary folder.'] },
      { type: 'heading', level: 2, text: 'Treat AI output as a helpful draft' },
      { type: 'paragraph', parts: ['AI can miss context, misunderstand a chart, or choose a category that feels close but not right. It can also produce a summary that sounds confident while omitting an important qualification. Keep the original post and source link visible, and verify anything consequential.'] },
      { type: 'paragraph', parts: ['Recallly stores enrichment alongside the saved item rather than replacing the source. You can ', { label: 'try the interactive demo', href: '/demo' }, ' to see how categories, topics, summaries, and the Reader fit together.'] },
      { type: 'heading', level: 2, text: 'Use AI where retrieval benefits' },
      { type: 'paragraph', parts: ['The point of enrichment is not to score everything. It is to make a future search more likely to succeed. Prefer specific, meaningful topics over a long list of generic labels, and let uncertain content remain lightly classified.'] },
      { type: 'heading', level: 2, text: 'A practical review loop' },
      { type: 'list', items: ['Save the post with its original context.', 'Let enrichment suggest a summary, category, and topics.', 'Use search and filters to test whether the labels help.', 'Correct only the items you expect to revisit often.'] },
    ],
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((article) => article.slug === slug);
}
