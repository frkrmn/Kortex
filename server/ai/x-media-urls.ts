// No server-side fetching. Only persisted, public X image URLs are passed to Gemini.
export function publicXImageUrls(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || entry.type !== 'image' || typeof entry.url !== 'string') return [];
    try {
      const url = new URL(entry.url);
      if (url.protocol !== 'https:' || url.hostname !== 'pbs.twimg.com' || !['', '443'].includes(url.port)
        || url.username || url.password) return [];
      return [url.toString()];
    } catch {
      return [];
    }
  }).slice(0, 4);
}
