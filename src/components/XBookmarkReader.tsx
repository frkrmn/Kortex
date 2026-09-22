import React from 'react';
import { ExternalLink, ImageOff, Play, ChevronDown } from 'lucide-react';
import type { Bookmark, BookmarkMedia, BookmarkReferencedPost } from '../types';

function dateLabel(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MediaGallery({ media }: { media: BookmarkMedia[] }) {
  if (!media.length) return null;
  return (
    <div className={`grid gap-2 overflow-hidden rounded-2xl border border-[#E8E8E5] bg-[#F5F5F3] ${media.length > 1 ? 'sm:grid-cols-2' : ''}`}>
      {media.map((item, index) => (
        <figure key={item.mediaKey || `${item.url}-${index}`} className="relative min-w-0 bg-[#F5F5F3]">
          <img
            src={item.previewUrl || item.url}
            alt={item.alt || `X post media ${index + 1}`}
            width={item.width}
            height={item.height}
            loading="lazy"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
            className={`w-full object-contain ${media.length === 1 ? 'max-h-[34rem]' : 'h-64'}`}
          />
          {item.type === 'video' && (
            <figcaption className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
              <Play className="h-3 w-3 fill-current" /> Video preview
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

function ThreadPost({ post }: { post: BookmarkReferencedPost }) {
  return (
    <div className="relative pl-7">
      <span className="absolute left-[7px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#A3A39D] ring-1 ring-[#D9D9D3]" />
      <div className="rounded-xl border border-[#E8E8E5] bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-xs">
          {post.authorAvatarUrl && <img src={post.authorAvatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />}
          <span className="font-semibold text-[#242422]">{post.authorName || 'X author'}</span>
          {post.authorUsername && <span className="text-[#8A8A85]">@{post.authorUsername}</span>}
          {dateLabel(post.publishedAt) && <span className="ml-auto text-[#8A8A85]">{dateLabel(post.publishedAt)}</span>}
        </div>
        {post.available && post.text ? (
          <p className="whitespace-pre-line text-sm leading-6 text-[#30302D]">{post.text}</p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-[#8A8A85]"><ImageOff className="h-4 w-4" /> Referenced post is not available in this response.</p>
        )}
        <div className="mt-3"><MediaGallery media={post.media || []} /></div>
      </div>
    </div>
  );
}

export function XBookmarkReader({ bookmark }: { bookmark: Bookmark }) {
  const unavailable = bookmark.source === 'twitter' && Boolean(bookmark.external_content_status && bookmark.external_content_status !== 'available');
  const availableThreadPosts = (bookmark.referenced_posts || []).filter(post => post.type === 'replied_to');
  const published = dateLabel(bookmark.published_at);

  return (
    <article className="space-y-5 rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs sm:p-7">
      <header className="flex items-start justify-between gap-4 border-b border-[#F0F0EC] pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <img src={bookmark.author_avatar} alt={bookmark.author_name} className="h-11 w-11 shrink-0 rounded-full border border-[#E5E5E0] object-cover" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-[#171717]">{bookmark.author_name}</h1>
            <p className="truncate text-xs text-[#70706B]">@{bookmark.author_username}</p>
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-[#8A8A85]">
          <span className="block font-medium text-[#52524E]">X post</span>
          {published && <time dateTime={bookmark.published_at}>{published}</time>}
        </div>
      </header>

      {unavailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This post is no longer available from X.
        </div>
      ) : (
        <>
          <p className="whitespace-pre-line text-[16px] leading-7 text-[#242422] selection:bg-amber-100">{bookmark.content}</p>
          <MediaGallery media={bookmark.media || []} />
        </>
      )}

      {!unavailable && bookmark.thread_detected && availableThreadPosts.length > 0 && (
        <details className="group rounded-xl border border-[#E8E8E5] bg-[#FAFAF8]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#242422]">
            <span>Thread · {availableThreadPosts.length + 1} available posts</span>
            <ChevronDown className="h-4 w-4 text-[#8A8A85] transition-transform group-open:rotate-180" />
          </summary>
          <div className="relative space-y-3 border-t border-[#E8E8E5] p-4 before:absolute before:bottom-8 before:left-[22px] before:top-7 before:w-px before:bg-[#D9D9D3]">
            {availableThreadPosts.map(post => (
              <React.Fragment key={`${post.type}-${post.externalId}`}>
                <ThreadPost post={post} />
              </React.Fragment>
            ))}
            <div className="relative pl-7">
              <span className="absolute left-[7px] top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2563EB] ring-1 ring-blue-300" />
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-blue-700">Bookmarked post</span>
                <p className="whitespace-pre-line text-sm leading-6 text-[#242422]">{bookmark.content}</p>
              </div>
            </div>
            {!bookmark.thread_fully_available && (
              <p className="pl-7 text-xs text-[#8A8A85]">Partial conversation. Recallly only shows posts returned by the official X API.</p>
            )}
          </div>
        </details>
      )}

      <footer className="flex items-center justify-between gap-4 border-t border-[#F0F0EC] pt-4 text-xs text-[#70706B]">
        <span>Source: X</span>
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-[#2563EB] hover:underline">
          View original on X <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </footer>
    </article>
  );
}
