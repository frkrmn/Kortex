export type BlogInlinePart = string | { label: string; href: string };

export type BlogBlock =
  | { type: 'paragraph'; parts: BlogInlinePart[] }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; title: string; text: string };

export type BlogArticle = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  readingTime: string;
  category: string;
  blocks: BlogBlock[];
  faq?: { question: string; answer: string }[];
  relatedSlugs: string[];
};

const link = (label: string, href: string): BlogInlinePart => ({ label, href });

export const blogArticles: BlogArticle[] = [
  {
    slug: 'how-to-organize-x-bookmarks',
    title: 'How to organize your X bookmarks so they stay useful',
    seoTitle: 'How to Organize X Bookmarks So They Stay Useful | Find Again',
    description: 'A practical workflow for turning a growing collection of saved X posts into something you can revisit, search, and use.',
    author: 'Find Again Editorial', publishedAt: '2026-09-30', readingTime: '6 min read', category: 'Bookmark workflows',
    relatedSlugs: ['twitter-x-bookmark-folders', 'search-and-rediscover-x-bookmarks', 'ai-categorize-x-bookmarks'],
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
      { type: 'paragraph', parts: ['Find Again keeps the saved item available in its Reader and preserves a link back to X. You can ', link('explore the public demo', '/signup'), ' to see the reading flow before connecting an account.'] },
      { type: 'heading', level: 2, text: 'Review the system when you need something' },
      { type: 'paragraph', parts: ['A good bookmark system is tested by retrieval. Search for a topic you remember, filter by a broad category, and open the saved item in context. If the result is noisy, refine the topic vocabulary you use next time rather than building a deeper folder tree.'] },
      { type: 'heading', level: 2, text: 'The goal is useful rediscovery' },
      { type: 'paragraph', parts: ['Organization is a means to an end: returning to a saved idea at the right moment. Start with a small vocabulary, preserve source context, and let search and reading do most of the work.'] },
    ],
  },
  {
    slug: 'search-and-rediscover-x-bookmarks',
    title: 'How to search and rediscover saved X posts',
    seoTitle: 'How to Search and Rediscover Saved X Posts | Find Again',
    description: 'A retrieval-first guide to finding the right saved post without scrolling through your entire bookmark history.',
    author: 'Find Again Editorial', publishedAt: '2026-09-30', readingTime: '5 min read', category: 'Rediscovery',
    relatedSlugs: ['how-to-organize-x-bookmarks', 'build-a-read-later-workflow-from-x-bookmarks', 'ai-categorize-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['A bookmark library becomes valuable when it answers a future question quickly. Search is the bridge between “I remember saving something about this” and the original post.'] },
      { type: 'heading', level: 2, text: 'Search for the idea, not only the author' },
      { type: 'paragraph', parts: ['Start with the concept you remember: “activation,” “vector database,” or “pricing page.” A useful library can search across saved text and metadata, so the words inside the post and its organization signals both help narrow the result.'] },
      { type: 'heading', level: 2, text: 'Use category and topic context' },
      { type: 'paragraph', parts: ['If a broad search returns too much, add context. Select a category such as Product, then use a topic such as onboarding or retention. The combination is more useful than a long list of nested folders because topics remain flexible metadata.'] },
      { type: 'list', items: ['Begin with one memorable phrase or concept.', 'Limit the search to a category when the result set is broad.', 'Use a topic to separate related ideas.', 'Open the Reader to recover the post’s context and source link.'] },
      { type: 'heading', level: 2, text: 'Read the saved post in context' },
      { type: 'paragraph', parts: ['A search result is only useful if it helps you decide what to do next. Open the item, check the author and publication date, read the surrounding text, and follow the original source when you need more context. Find Again’s ', link('Reader', '/signup'), ' keeps saved content and the source action together.'] },
      { type: 'heading', level: 2, text: 'Make future retrieval easier' },
      { type: 'paragraph', parts: ['When you save a post, choose a category and a few topics that match the questions you may ask later. The best label is not the most precise one; it is the one that will help you recognize the post months from now.'] },
      { type: 'callout', title: 'Retrieval test', text: 'If you cannot describe the question that would lead you back to a bookmark, the bookmark probably needs a clearer topic or note.' },
    ],
  },
  {
    slug: 'ai-categorize-x-bookmarks',
    title: 'How AI can help categorize X bookmarks without replacing your judgment',
    seoTitle: 'How AI Can Categorize X Bookmarks Without Replacing Your Judgment | Find Again',
    description: 'What AI enrichment is good at in a bookmark library, where it can fail, and how to keep the original source in control.',
    author: 'Find Again Editorial', publishedAt: '2026-09-30', readingTime: '6 min read', category: 'AI bookmark organization',
    relatedSlugs: ['how-to-organize-x-bookmarks', 'search-and-rediscover-x-bookmarks', 'review-ai-summaries-of-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['Manual organization does not scale well when saving is effortless. AI enrichment can provide a useful first pass by summarizing a post, suggesting one broad category, and extracting a few topics or concepts.'] },
      { type: 'heading', level: 2, text: 'Where AI enrichment helps' },
      { type: 'paragraph', parts: ['The strongest use is reducing the blank-page problem after saving. A concise summary can preserve why a post matters, while topics make a library easier to filter. This is especially helpful when a saved post is long, technical, or has useful visual context.'] },
      { type: 'heading', level: 2, text: 'Treat AI output as a helpful draft' },
      { type: 'paragraph', parts: ['AI can miss context, misunderstand a chart, or choose a category that feels close but not right. It can also produce a summary that sounds confident while omitting an important qualification. Keep the original post and source link visible, and verify anything consequential.'] },
      { type: 'heading', level: 2, text: 'Use a simple taxonomy' },
      { type: 'paragraph', parts: ['One primary category is enough for navigation. Flexible topics can hold the nuance. A simple model is easier to understand, easier to search, and less likely to force a post into an arbitrary folder.'] },
      { type: 'paragraph', parts: ['Find Again stores enrichment alongside the saved item rather than replacing the source. ', link('Start with the library', '/signup'), ' when you want categories, topics, summaries, and Reader context in one place.'] },
      { type: 'heading', level: 2, text: 'Use AI where retrieval benefits' },
      { type: 'paragraph', parts: ['The point of enrichment is not to score everything. It is to make a future search more likely to succeed. Prefer specific, meaningful topics over a long list of generic labels, and let uncertain content remain lightly classified.'] },
      { type: 'heading', level: 2, text: 'A practical review loop' },
      { type: 'list', items: ['Save the post with its original context.', 'Let enrichment suggest a summary, category, and topics when available.', 'Use search and filters to test whether the labels help.', 'Correct only the items you expect to revisit often.'] },
    ],
  },
  {
    slug: 'twitter-x-bookmark-folders',
    title: 'X bookmark folders: a practical system beyond one folder per idea',
    seoTitle: 'X Bookmark Folders: A Practical Organization System | Find Again',
    description: 'How to use X bookmark folders as a starting point, then add searchable context without building a filing system you will abandon.',
    author: 'Find Again Editorial', publishedAt: '2026-10-07', readingTime: '7 min read', category: 'Bookmark workflows',
    relatedSlugs: ['how-to-organize-x-bookmarks', 'search-and-rediscover-x-bookmarks', 'export-preserve-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['X bookmark folders are useful for a quick first sort, but a folder name rarely captures every reason a post matters. A product thread might be useful for onboarding, pricing, and writing. The durable system is not the deepest folder tree; it is a small amount of context that helps you retrieve the post later.'] },
      { type: 'heading', level: 2, text: 'What folders are good at' },
      { type: 'paragraph', parts: ['Use a folder for a stable destination: “Read soon,” “Product references,” or “Recipes to try.” Choose names that describe the next action or the broad area, not every topic inside the post. X’s own bookmark features can change by account and plan, so treat folders as a convenience layer rather than your only copy of the library.'] },
      { type: 'heading', level: 2, text: 'Where folders stop being enough' },
      { type: 'paragraph', parts: ['A post can belong to several useful searches at once. Nested folders create maintenance work, and a folder called “AI” does not tell you whether a post is about evaluation, product strategy, or a specific tool. Add topics for those details, then let search do the cross-cutting work.'] },
      { type: 'list', items: ['Keep a small set of broad categories.', 'Use topics for concepts that cross categories.', 'Record the reason you saved an item when it is not obvious.', 'Keep the original author, date, text, and X link attached.'] },
      { type: 'heading', level: 2, text: 'A folder-to-library workflow' },
      { type: 'heading', level: 3, text: '1. Capture without interrupting the moment' },
      { type: 'paragraph', parts: ['Bookmark the post in X when you encounter it. Do not stop to invent the perfect taxonomy in the middle of reading. A quick capture habit is more valuable than a complicated system you avoid.'] },
      { type: 'heading', level: 3, text: '2. Import and add searchable context' },
      { type: 'paragraph', parts: ['Find Again can import saved X bookmarks through the official X integration. It stores the post with its source link, then gives you categories, topics, AI enrichment, and collections where supported. This creates more retrieval paths than a single folder name.'] },
      { type: 'heading', level: 3, text: '3. Test the folder with a future question' },
      { type: 'paragraph', parts: ['Imagine needing the post six months from now. Would you search for “activation checklist,” the author, or “product onboarding”? Add only the context that answers that question. See the companion guide on ', link('organizing X bookmarks', '/blog/how-to-organize-x-bookmarks'), ' for a lighter taxonomy.'] },
      { type: 'heading', level: 2, text: 'Do not confuse organization with preservation' },
      { type: 'paragraph', parts: ['A folder is not a guarantee that a post will remain available. X content can be deleted, restricted, or unavailable through the official API. Keep the source link and treat summaries as navigation aids, not as ownership of or a permanent replacement for the original post.'] },
      { type: 'heading', level: 2, text: 'Choose labels that survive changing projects' },
      { type: 'paragraph', parts: ['Your projects change faster than your library. A folder called “Q4 launch” may make sense today and become meaningless next year. Prefer a stable category such as Product or Writing, then add a topic such as onboarding, positioning, or examples. If the post is tied to a specific project, keep that project in a note or collection rather than rebuilding the whole folder structure when priorities move.'] },
      { type: 'heading', level: 2, text: 'A worked example' },
      { type: 'paragraph', parts: ['Imagine saving a thread about a product onboarding experiment. In X, place it in a broad product or read-later folder. In Find Again, give it the Product category and topics such as activation and onboarding, then add a short note: “Compare this with our welcome flow before the next experiment.” Months later, a search for activation or welcome flow can recover it even if you no longer remember the folder name.'] },
      { type: 'paragraph', parts: ['This approach also makes review cheaper. You can inspect a category or collection without deciding whether every post deserves a permanent home. Keep the number of top-level labels small, and let the post’s text, author, topics, and source link provide the detail.'] },
      { type: 'heading', level: 2, text: 'When to merge or retire a folder' },
      { type: 'paragraph', parts: ['A folder that contains only a few items is not automatically a problem, but a growing list of one-off folders is a warning sign. Every few weeks, merge folders that answer the same question and remove destinations you no longer use. Do this at the level of broad intent: “reference,” “read soon,” and “try” are usually more durable than a list of temporary campaigns.'] },
      { type: 'paragraph', parts: ['If X changes which folder features are available to your account, the organization you added in Find Again remains a separate layer. The official integration still determines which saved posts can be imported, so keep the system honest about what arrived and when. That separation lets you improve retrieval without pretending the provider is a permanent archive.'] },
      { type: 'callout', title: 'A practical default', text: 'Use folders for broad destinations, categories for navigation, topics for retrieval, and the original X link for context.' },
    ],
  },
  {
    slug: 'build-a-read-later-workflow-from-x-bookmarks',
    title: 'How to build a read-later workflow from X bookmarks',
    seoTitle: 'Build a Read-Later Workflow from X Bookmarks | Find Again',
    description: 'A simple capture, review, and retrieval loop for turning saved X posts into a read-later queue you can actually finish.',
    author: 'Find Again Editorial', publishedAt: '2026-10-07', readingTime: '7 min read', category: 'Saved-post workflows',
    relatedSlugs: ['search-and-rediscover-x-bookmarks', 'twitter-x-bookmark-folders', 'export-preserve-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['“Read it later” fails when later has no shape. A useful X bookmark workflow separates capture from review, gives each saved post a next action, and leaves a trail that helps you find the idea after the original feed has moved on.'] },
      { type: 'heading', level: 2, text: 'Use three stages instead of one giant queue' },
      { type: 'list', items: ['Capture: save the post immediately when it is useful.', 'Triage: decide whether it is a read, reference, experiment, or discard.', 'Return: search and open the items that match your current question.'] },
      { type: 'paragraph', parts: ['The stages prevent a common mistake: treating every bookmark as a commitment to read a long thread tonight. Some posts are references, some are prompts for a project, and some were interesting only in the moment. Naming that difference is already useful organization.'] },
      { type: 'heading', level: 2, text: 'Make the triage pass deliberately small' },
      { type: 'paragraph', parts: ['Set a short weekly review rather than trying to clear the entire backlog. Open a handful of saved posts, skim enough to understand the point, and assign one category or topic. If you cannot explain why you will return to it, leave it lightly classified or remove it from your working queue.'] },
      { type: 'heading', level: 2, text: 'Keep reading and retrieval connected' },
      { type: 'paragraph', parts: ['The best read-later tool does not stop at a checklist. You need the post text, author, date, media where available, and a link back to X when you want the source. Find Again’s Reader gives saved content a focused reading surface, while search and topics help you return to a post by idea rather than by the day you saved it.'] },
      { type: 'heading', level: 2, text: 'A weekly workflow that stays manageable' },
      { type: 'heading', level: 3, text: 'Monday: capture freely' },
      { type: 'paragraph', parts: ['Save useful posts in X without deciding their final home. The official API controls what can later be imported, so do not promise yourself that every old bookmark will be available forever.'] },
      { type: 'heading', level: 3, text: 'Midweek: review a small batch' },
      { type: 'paragraph', parts: ['Import or manually sync the latest available bookmarks, then review a small batch. Add a category, topic, or note only when it improves a future search. Find Again can also add AI summaries and enrichment where enabled; treat those outputs as drafts that deserve judgment.'] },
      { type: 'heading', level: 3, text: 'Friday: retrieve one idea on purpose' },
      { type: 'paragraph', parts: ['Search for something you need now, such as “pricing research” or “writing examples.” Open the Reader, follow the source link when necessary, and turn one saved idea into an action or a reference. The companion guide on ', link('searching saved X posts', '/blog/search-and-rediscover-x-bookmarks'), ' covers the retrieval side in more detail.'] },
      { type: 'heading', level: 2, text: 'Keep the boundary clear' },
      { type: 'paragraph', parts: ['Find Again organizes and enriches saved posts; it does not guarantee complete historical import, permanent availability, or perfect summaries. X availability depends on the official API, and a deleted or restricted post may no longer be readable. A read-later workflow is strongest when it preserves the source link and uses the library to guide your attention, not to make unsupported archival promises.'] },
      { type: 'heading', level: 2, text: 'Define what “read” means' },
      { type: 'paragraph', parts: ['A read-later queue becomes discouraging when the only success condition is finishing every thread. Use smaller outcomes: understand the claim, save one useful quote in your own notes, test the suggested technique, or decide that the post is no longer relevant. Marking that outcome in a collection or note gives the bookmark a purpose beyond being “unread.”'] },
      { type: 'heading', level: 2, text: 'Handle long threads in passes' },
      { type: 'paragraph', parts: ['For a long thread, first read the opening and the author’s conclusion. If it still matters, use the Reader to inspect the available conversation context and open the original X post for replies or linked sources. Capture the question you want answered before returning; a focused question is easier to search later than a vague promise to read the entire thread.'] },
      { type: 'paragraph', parts: ['Finally, keep the queue finite. A weekly review of ten saved posts is more sustainable than an ambitious inbox-zero ritual. Search can bring older items back when a real project needs them, so you do not have to consume every bookmark in chronological order.'] },
      { type: 'heading', level: 2, text: 'Give every saved post a retrieval cue' },
      { type: 'paragraph', parts: ['A retrieval cue is a phrase your future self would actually type. “Interesting thread” is not a cue; “activation email teardown” is. Add one specific topic or note when you review a bookmark, especially if the post uses unusual language that will not match the way you remember the idea.'] },
      { type: 'paragraph', parts: ['The cue can also be a decision: “revisit before pricing test,” “reference for onboarding,” or “compare with our API docs.” When the same question appears in a new project, search can surface the saved post without requiring you to remember the author, date, or exact wording.'] },
    ],
  },
  {
    slug: 'export-preserve-x-bookmarks',
    title: 'How to export and preserve the useful context around X bookmarks',
    seoTitle: 'How to Export and Preserve X Bookmarks | Find Again',
    description: 'What an export can preserve, what it cannot guarantee, and how to make a usable backup of your organized X bookmark library.',
    author: 'Find Again Editorial', publishedAt: '2026-10-07', readingTime: '7 min read', category: 'Bookmark maintenance',
    relatedSlugs: ['build-a-read-later-workflow-from-x-bookmarks', 'how-to-organize-x-bookmarks', 'ai-categorize-x-bookmarks'],
    blocks: [
      { type: 'paragraph', parts: ['Export is part of a trustworthy bookmark workflow, but “preserve my bookmarks” can mean several different things. You may want a list of source links, a copy of the text available to the app, your categories and notes, or a durable archive of media. These are different outcomes, and a good export explains the boundary.'] },
      { type: 'heading', level: 2, text: 'Decide what you are trying to keep' },
      { type: 'list', items: ['A searchable inventory of saved posts and source URLs.', 'The organization you added: categories, topics, collections, and notes.', 'AI summaries and enrichment that help you review the inventory.', 'A pointer back to X for original context and current availability.'] },
      { type: 'paragraph', parts: ['A JSON export is especially useful for the first three. It is structured, inspectable, and easier to move into another script or storage system than a screenshot or a browser bookmark folder. It should not be described as a guaranteed copy of every post or attachment.'] },
      { type: 'heading', level: 2, text: 'Use a three-part preservation routine' },
      { type: 'heading', level: 3, text: '1. Keep the source link' },
      { type: 'paragraph', parts: ['The X URL is the bridge to the original author, thread, replies, and any context that the API did not return. Find Again keeps that link alongside the saved item so an export remains useful even when you need to leave the library.'] },
      { type: 'heading', level: 3, text: '2. Export the library after review' },
      { type: 'paragraph', parts: ['Use Find Again’s JSON export after a review pass so categories, topics, collections, notes, summaries, and available saved content travel together. Name exports by date, store them somewhere you control, and make a second copy if the library is important to your work.'] },
      { type: 'heading', level: 3, text: '3. Revisit availability, not just files' },
      { type: 'paragraph', parts: ['A file on disk does not make an X post permanently available. Posts can be deleted, protected, withheld, or omitted from a later API response. Periodically open the links for the items you rely on and record your own notes or decisions outside the source when they matter.'] },
      { type: 'heading', level: 2, text: 'What Find Again can and cannot preserve' },
      { type: 'paragraph', parts: ['Find Again can import the latest bookmarks made available through the official X integration, store the returned content and metadata, add organization and AI enrichment, and export the library as JSON. Availability depends on the provider, and the initial import is not a promise of complete historical access. A summary is a navigation aid, not a substitute for the original post or a claim of ownership.'] },
      { type: 'heading', level: 2, text: 'Make the export useful six months from now' },
      { type: 'paragraph', parts: ['Before exporting, search for the project or question that matters to you and check that the relevant posts have meaningful topics. A future reader needs enough context to understand why an item was saved, not only an opaque identifier. Read ', link('how AI enrichment can help', '/blog/ai-categorize-x-bookmarks'), ' and keep consequential judgments in your own notes.'] },
      { type: 'heading', level: 2, text: 'A simple JSON backup routine' },
      { type: 'paragraph', parts: ['Export after a meaningful review rather than after every bookmark. Use a predictable filename such as find-again-library-2026-10-07.json, keep the date in your backup notes, and store the file somewhere separate from the browser or laptop where you use the app. If you later migrate data, the structured records make it easier to inspect what is present before importing anything.'] },
      { type: 'heading', level: 2, text: 'Preserve decisions outside the source' },
      { type: 'paragraph', parts: ['A source post can explain an idea without recording what you decided to do with it. For important bookmarks, add your own short note: the decision, experiment, or question the post informed. That note belongs to your workflow and remains useful even if the original post changes or becomes unavailable.'] },
      { type: 'paragraph', parts: ['Re-export when your organization changes, not only when new posts arrive. A backup that contains the latest categories, collections, and notes is more useful than a larger file with stale context. This is also a good time to remove duplicates and verify that your highest-value source links still open.'] },
      { type: 'heading', level: 2, text: 'Be explicit about media and deleted posts' },
      { type: 'paragraph', parts: ['Images, video, quoted posts, and conversation relationships may have different availability from the text of the saved item. Check the exported records and source links before calling an export a complete archive. If a post is deleted, protected, or withheld, the best available record may be its URL, your own note, and the organization you added around it.'] },
      { type: 'paragraph', parts: ['That limitation is useful to state plainly when you share a backup with a teammate or move it into another tool. Find Again can preserve available content and context returned by the official X integration, but it cannot grant rights to content that belongs to someone else or restore a post the provider no longer exposes.'] },
      { type: 'callout', title: 'The honest promise', text: 'Export the organization and available content you control; retain source links for the context that belongs to X.' },
    ],
  },
];

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return blogArticles.find((article) => article.slug === slug);
}
