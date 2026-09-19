import React, { useState } from 'react';
import {
  ArrowLeft,
  FolderKanban,
  Globe,
  Lock,
  Share2,
  Edit3,
  Trash2,
  Plus,
  Bookmark as BookmarkIcon,
  Sparkles,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { BookmarkCard } from '../components/BookmarkCard';
import { CollectionModal } from '../components/CollectionModal';

export const CollectionDetailView: React.FC = () => {
  const { params, navigate } = useRouter();
  const {
    getCollection,
    getCollectionBookmarks,
    collections,
    updateCollection,
    deleteCollection,
    toggleFavorite,
    toggleRead,
    toggleBookmarkInCollection,
    deleteBookmark,
    showToast,
  } = useDemoStore();

  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

  const collection = getCollection(params.slug);

  if (!collection) {
    return (
      <div className="py-20 text-center space-y-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-[#171717]">Collection not found</h2>
        <p className="text-sm text-[#70706B]">
          The collection you requested may have been deleted or moved.
        </p>
        <button
          onClick={() => navigate('/collections')}
          className="px-4 py-2 rounded-xl bg-[#171717] text-[#FAFAF8] text-xs font-semibold"
        >
          Back to collections
        </button>
      </div>
    );
  }

  const collectionBookmarks = getCollectionBookmarks(collection);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Collection link copied to clipboard');
    } else {
      showToast('Link ready to share');
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete collection "${collection.name}"?`)) {
      deleteCollection(collection.id);
      navigate('/collections');
    }
  };

  return (
    <div id="collection-detail-view" className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/collections')}
        className="flex items-center gap-2 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to collections</span>
      </button>

      {/* Collection Header Card */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-[#EEF4FF] text-[#2563EB] shrink-0">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
                  {collection.name}
                </h1>
                <span
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                    collection.visibility === 'public'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-[#F4F4F1] text-[#70706B] border-[#E5E5E0]'
                  }`}
                >
                  {collection.visibility === 'public' ? (
                    <>
                      <Globe className="w-3 h-3" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Private</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5C5C58] max-w-2xl leading-relaxed">
                {collection.description || 'No description added yet.'}
              </p>
              <div className="text-xs text-[#8A8A85] pt-1">
                {collection.bookmark_ids.length} bookmarks curated by {collection.creator_name || 'Faruk'}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => navigate(`/ask?collection=${collection.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] border border-[#DBEAFE] hover:bg-[#DBEAFE] text-xs font-semibold text-[#2563EB] transition-colors cursor-pointer"
              title="Ask conversational AI questions scoped to this collection"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Ask AI</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8E8E5] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#70706B]" />
              <span>Share</span>
            </button>

            <button
              onClick={() => setIsEditingModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8E8E5] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#70706B]" />
              <span>Edit</span>
            </button>

            <button
              onClick={handleDelete}
              title="Delete collection"
              className="p-2 rounded-lg text-[#8A8A85] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bookmarks Feed in Collection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-sm font-semibold text-[#171717]">
            Items in this collection ({collectionBookmarks.length})
          </h2>
          <button
            onClick={() => navigate('/bookmarks')}
            className="flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add from library</span>
          </button>
        </div>

        {collectionBookmarks.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl space-y-3">
            <BookmarkIcon className="w-8 h-8 text-[#A0A09A] mx-auto" />
            <h3 className="text-sm font-semibold text-[#171717]">No bookmarks in this collection</h3>
            <p className="text-xs text-[#70706B] max-w-sm mx-auto">
              Explore your library and tap the "Collection" button on any bookmark to add it here.
            </p>
            <button
              onClick={() => navigate('/bookmarks')}
              className="px-3.5 py-1.5 rounded-xl bg-[#171717] text-[#FAFAF8] text-xs font-medium"
            >
              Browse bookmarks
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {collectionBookmarks.map((bm) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                collections={collections}
                variant="row"
                onOpenDetail={(b) => navigate(`/bookmarks/${b.id}`)}
                onToggleRead={toggleRead}
                onToggleFavorite={toggleFavorite}
                onToggleCollection={toggleBookmarkInCollection}
                onDeleteBookmark={deleteBookmark}
                onSelectTopic={(t) => navigate(`/bookmarks?topic=${encodeURIComponent(t.toLowerCase())}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Collection Modal */}
      {isEditingModalOpen && (
        <CollectionModal
          isOpen={isEditingModalOpen}
          onClose={() => setIsEditingModalOpen(false)}
          editingCollection={collection}
          onSave={async (name, description, visibility) => {
            updateCollection(collection.id, { name, description, visibility });
          }}
        />
      )}
    </div>
  );
};
