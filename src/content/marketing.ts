import { DEFAULT_TRIAL_DAYS, DEFAULT_X_BOOKMARK_HISTORY_LIMIT, X_HISTORY_EXPLANATION } from '../config/plans';

export const marketingFaqs = [
  { question: 'How many X bookmarks can Recallly import?', answer: `${X_HISTORY_EXPLANATION} The current product safeguard is approximately the latest ${DEFAULT_X_BOOKMARK_HISTORY_LIMIT.toLocaleString()} bookmarks. Once connected, Recallly can continue syncing new bookmarks so your library keeps growing over time.` },
  { question: 'Will Recallly keep syncing new bookmarks?', answer: 'Recallly provides manual X bookmark sync. Automatic sync is available only for eligible accounts where the production rollout is enabled.' },
  { question: 'Can my Recallly library grow beyond the initial import window?', answer: 'Yes. The historical window applies only to bookmarks X makes available during the initial import. New bookmarks can continue being added after you connect your account.' },
  { question: 'What happens if an X post is deleted?', answer: 'If a post becomes unavailable on X, Recallly may mark the original content as unavailable. Your Recallly organization, such as collections and notes, can remain where appropriate.' },
  { question: 'What permissions does Recallly request from my X account?', answer: 'Recallly requests read-only permissions for bookmarks, posts, and user data, plus offline access for authorized synchronization. It cannot post, send direct messages, follow accounts, or access your X password.' },
  { question: 'How does search work?', answer: 'Recallly searches stored bookmark text and available enrichment metadata. You can keep a selected category active, then narrow results further with a topic filter or search query.' },
  { question: 'Can I export my data?', answer: 'You can export available profile data, saved content, completed AI enrichment, collections, and digests as structured JSON from Settings.' },
  { question: `What is included in the ${DEFAULT_TRIAL_DAYS}-day free trial?`, answer: 'Stripe Checkout shows current trial eligibility, Pro access, price, and payment terms before you confirm.' },
];
