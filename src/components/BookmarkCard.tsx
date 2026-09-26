import React, { useState } from 'react';
import {
  Heart,
  CheckCircle2,
  FolderPlus,
  ExternalLink,
  Sparkles,
  ThumbsUp,
  Repeat2,
  Check,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { Bookmark, Collection } from '../types';

interface BookmarkCardProps {
  bookmark: Bookmark;
  collections?: Collection[];
  variant?: 'card' | 'row' | 'compact';
  onOpenDetail: (bookmark: Bookmark) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onToggleCollection?: (collectionId: string, bookmarkId: string) => void;
  onDeleteBookmark?: (id: string) => void;
  onSelectTopic?: (topic: string) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  collections = [],
  variant = 'row',
  onOpenDetail,
  onToggleRead,
  onToggleFavorite,
  onToggleCollection,
  onDeleteBookmark,
  onSelectTopic,
}) => {
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const formattedDate = new Date(bookmark.published_at || bookmark.bookmark_created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const mediaItem = bookmark.media && bookmark.media.length > 0 ? bookmark.media[0] : null;
  const unavailableOnX = bookmark.source === 'twitter' && bookmark.external_content_status && bookmark.external_content_status !== 'available';

  if (variant === 'compact') {
    return (
      <div
        id={`bookmark-compact-${bookmark.id}`}
        onClick={() => onOpenDetail(bookmark)}
        className="group relative bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] rounded-xl p-3 transition-all hover:shadow-2xs cursor-pointer flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={bookmark.author_avatar}
            alt={bookmark.author_name}
            className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#E8E8E5]"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#171717] truncate">{bookmark.author_name}</span>
              <span className="text-[10px] text-[#8A8A85]">@{bookmark.author_username}</span>
              <span className="text-[10px] text-[#8A8A85]">• {formattedDate}</span>
            </div>
            <p className="text-xs text-[#52524E] truncate mt-0.5">{bookmark.content}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleFavorite(bookmark.id, !bookmark.is_favorite)}
            title={bookmark.is_favorite ? 'Favorited' : 'Favorite'}
            className="p-1 rounded-md text-[#8A8A85] hover:text-rose-600 hover:bg-rose-50"
          >
            <Heart className={`w-3.5 h-3.5 ${bookmark.is_favorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
          <button
            onClick={() => onToggleRead(bookmark.id, !bookmark.is_read)}
            title={bookmark.is_read ? 'Mark unread' : 'Mark read'}
            className="p-1 rounded-md text-[#8A8A85] hover:text-blue-600 hover:bg-blue-50"
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${bookmark.is_read ? 'text-blue-600' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // Row / Standard Content-Row Layout
  return (
    <div
      id={`bookmark-item-${bookmark.id}`}
      className="group relative bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D5D5CF] rounded-xl p-4 sm:p-5 transition-all hover:shadow-xs flex flex-col justify-between"
    >
      <div>
        {unavailableOnX && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
            This post is no longer available on X.
          </div>
        )}
        {/* Top Meta: Author info & Quick Controls */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={bookmark.author_avatar}
              alt={bookmark.author_name}
              className="w-9 h-9 rounded-full object-cover border border-[#E5E5E0] shrink-0"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-xs text-[#171717]">{bookmark.author_name}</span>
                <span className="text-[11px] text-[#70706B]">@{bookmark.author_username}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A8A85] mt-0.5">
                <span>{formattedDate}</span>
                {bookmark.ai_category && <span className="rounded bg-[#EEF4FF] px-1.5 py-0.5 text-[#1E3A8A]">{bookmark.ai_category}</span>}
                <span>•</span>
                <span className="capitalize font-medium text-[#70706B]">X post</span>
                {!bookmark.is_read && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">Unread</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Read status indicator */}
            <button
              id={`toggle-read-${bookmark.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(bookmark.id, !bookmark.is_read);
              }}
              title={bookmark.is_read ? 'Mark as unread' : 'Mark as read'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                bookmark.is_read
                  ? 'text-blue-600 bg-blue-50/70 hover:bg-blue-100/70'
                  : 'text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>

            {/* Favorite toggle */}
            <button
              id={`toggle-fav-${bookmark.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(bookmark.id, !bookmark.is_favorite);
              }}
              title={bookmark.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                bookmark.is_favorite
                  ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                  : 'text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE]'
              }`}
            >
              <Heart className={`w-4 h-4 ${bookmark.is_favorite ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Open Original */}
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open original on X"
              className="p-1.5 text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE] rounded-lg transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* More Menu Toggle */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                  setShowCollectionPicker(false);
                }}
                className="p-1.5 text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE] rounded-lg transition-colors cursor-pointer"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-40 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-lg p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenDetail(bookmark);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#171717] hover:bg-[#F4F4F1] font-medium"
                  >
                    View Details
                  </button>
                  {onDeleteBookmark && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDeleteBookmark(bookmark.id);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Body & Optional Media */}
        <div
          onClick={() => onOpenDetail(bookmark)}
          className="cursor-pointer space-y-3 mb-4"
        >
          <p className="text-[13px] text-[#242422] leading-relaxed line-clamp-4 font-normal whitespace-pre-line">
            {bookmark.content}
          </p>

          {/* Media Thumbnail */}
          {mediaItem && !unavailableOnX && (
            <div className="rounded-xl overflow-hidden border border-[#E8E8E5] max-h-56 bg-[#F5F5F3]">
              <img
                src={mediaItem.previewUrl || mediaItem.url}
                alt={mediaItem.alt || 'Post media'}
                className="w-full h-48 object-cover hover:scale-101 transition-transform duration-200"
                loading="lazy"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            </div>
          )}

          {/* AI Processing State Skeleton / Banner */}
          {(bookmark.enrichment_status === 'processing' || bookmark.enrichment_status === 'pending') && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100/80 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-indigo-700">
                  AI Analyzing post & classifying topics...
                </span>
              </div>
            </div>
          )}

          {/* AI Failed State */}
          {bookmark.enrichment_status === 'failed' && !bookmark.ai_summary && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-700">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                AI · Organizing will resume later
              </span>
            </div>
          )}
          {(bookmark.enrichment_status === 'pending' || bookmark.enrichment_status === 'processing') && !bookmark.ai_summary && (
            <span className="text-[11px] text-[#70706B]">AI · Organizing...</span>
          )}

          {/* AI Key Insight Card */}
          {bookmark.ai_summary && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8F9FA] border border-[#EBECEF] text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#4F46E5] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4F46E5]">
                    AI Summary
                  </span>
                  {bookmark.language && bookmark.language !== 'en' && (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold">
                      {bookmark.language}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#4A4A45] leading-normal line-clamp-2">
                  {bookmark.ai_summary}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Topics, Engagement & Collections */}
      <div className="pt-3 border-t border-[#F2F2EE] flex items-center justify-between gap-3 flex-wrap text-xs">
        {/* Topic Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {bookmark.ai_category && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EEF4FF] text-[#1E3A8A]">{bookmark.ai_category}</span>}
          {(bookmark.topics || []).map((topic) => (
            <button
              key={topic}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectTopic) onSelectTopic(topic);
              }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#F4F4F1] hover:bg-[#EAEAE5] text-[#555550] border border-[#E4E4DF] transition-colors cursor-pointer"
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Engagement Stats & Add to Collection */}
        <div className="relative flex items-center gap-3 text-[11px] text-[#8A8A85]">
          {bookmark.engagement?.likes ? (
            <span className="flex items-center gap-1" title={`${bookmark.engagement.likes} likes`}>
              <ThumbsUp className="w-3 h-3" />
              <span>{bookmark.engagement.likes.toLocaleString()}</span>
            </span>
          ) : null}

          {bookmark.engagement?.retweets ? (
            <span className="flex items-center gap-1" title={`${bookmark.engagement.retweets} retweets`}>
              <Repeat2 className="w-3 h-3" />
              <span>{bookmark.engagement.retweets.toLocaleString()}</span>
            </span>
          ) : null}

          {/* Add to Collection Button */}
          <button
            id={`add-to-col-${bookmark.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setShowCollectionPicker(!showCollectionPicker);
              setShowMoreMenu(false);
            }}
            className="flex items-center gap-1 p-1 hover:text-[#171717] hover:bg-[#F2F2EE] rounded-md transition-colors cursor-pointer"
            title="Save to Collection"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Collection</span>
          </button>

          {/* Collection Picker Dropdown */}
          {showCollectionPicker && collections.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-full right-0 mb-1.5 w-52 bg-[#FFFFFF] border border-[#E8E8E5] rounded-xl shadow-lg p-1.5 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-2 py-1 text-[10px] font-semibold text-[#8A8A85] uppercase tracking-wider">
                Add to Collection
              </div>
              {collections.map((col) => {
                const inCol = (col.bookmark_ids || []).includes(bookmark.id);
                return (
                  <button
                    key={col.id}
                    onClick={() => {
                      if (onToggleCollection) onToggleCollection(col.id, bookmark.id);
                      setShowCollectionPicker(false);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-[#171717] hover:bg-[#F4F4F1] transition-colors cursor-pointer"
                  >
                    <span className="truncate">{col.name}</span>
                    {inCol && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
