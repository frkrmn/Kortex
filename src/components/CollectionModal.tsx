import React, { useState } from 'react';
import { X, Lock, Globe, FolderKanban } from 'lucide-react';
import { Collection } from '../types';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, visibility: 'private' | 'public') => Promise<void>;
  editingCollection?: Collection | null;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCollection,
}) => {
  const [name, setName] = useState(editingCollection?.name || '');
  const [description, setDescription] = useState(editingCollection?.description || '');
  const [visibility, setVisibility] = useState<'private' | 'public'>(editingCollection?.visibility || 'private');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim(), description.trim(), visibility);
      onClose();
    } catch (err) {
      console.warn('Error saving collection:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="collection-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[#171717]" />
            <h3 className="font-semibold text-sm text-[#171717]">
              {editingCollection ? 'Edit Collection' : 'Create New Collection'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8A8A85] hover:text-[#171717] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Collection Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI Research, Startup Ideas, Design Inspo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-[#171717] placeholder-[#8A8A85] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1">
              Description (optional)
            </label>
            <textarea
              rows={3}
              placeholder="What kind of ideas belong in this library?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-[#171717] placeholder-[#8A8A85] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#171717] mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                  visibility === 'private'
                    ? 'border-[#171717] bg-[#F7F7F5] text-[#171717]'
                    : 'border-[#E8E8E5] text-[#70706B] hover:border-[#D0D0CB]'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <div>
                  <span className="block font-semibold">Private</span>
                  <span className="text-[10px] text-[#8A8A85]">Only visible to you</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                  visibility === 'public'
                    ? 'border-[#171717] bg-[#F7F7F5] text-[#171717]'
                    : 'border-[#E8E8E5] text-[#70706B] hover:border-[#D0D0CB]'
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <div>
                  <span className="block font-semibold">Public</span>
                  <span className="text-[10px] text-[#8A8A85]">Shareable URL</span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#70706B] hover:text-[#171717] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="px-4 py-2 text-xs font-medium bg-[#171717] text-[#FAFAF8] rounded-xl hover:bg-[#2B2B2B] transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingCollection ? 'Save Changes' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
