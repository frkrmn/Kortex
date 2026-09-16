import React, { useState } from 'react';
import {
  Home,
  Bookmark as BookmarkIcon,
  Search,
  MessageSquareText,
  Menu,
  Layers,
  FolderKanban,
  Sparkles,
  Mail,
  Settings,
  X,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';

interface MobileNavigationProps {
  onOpenSearch: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ onOpenSearch }) => {
  const { route, navigate } = useRouter();
  const { profile } = useDemoStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E8E8E5]">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-[#171717] text-[#FAFAF8] flex items-center justify-center font-bold text-xs shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#171717]">Recallly</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="p-2 text-[#70706B] hover:text-[#171717] rounded-lg border border-[#E8E8E5] bg-[#FFFFFF] shadow-2xs"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-full overflow-hidden border border-[#E0E0DC]"
          >
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-7 h-7 object-cover"
            />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-t border-[#E8E8E5] px-2 py-1.5 flex items-center justify-around"
      >
        <button
          onClick={() => {
            setIsMoreOpen(false);
            navigate('/dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 text-[11px] font-medium transition-colors ${
            route === 'dashboard' ? 'text-[#1E3A8A]' : 'text-[#70706B]'
          }`}
        >
          <Home className={`w-4 h-4 ${route === 'dashboard' ? 'text-[#2563EB]' : 'text-[#70706B]'}`} />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            setIsMoreOpen(false);
            navigate('/bookmarks');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 text-[11px] font-medium transition-colors ${
            route === 'bookmarks' || route === 'bookmark-detail' ? 'text-[#1E3A8A]' : 'text-[#70706B]'
          }`}
        >
          <BookmarkIcon
            className={`w-4 h-4 ${
              route === 'bookmarks' || route === 'bookmark-detail' ? 'text-[#2563EB]' : 'text-[#70706B]'
            }`}
          />
          <span>Bookmarks</span>
        </button>

        <button
          onClick={() => {
            setIsMoreOpen(false);
            onOpenSearch();
          }}
          className="flex flex-col items-center gap-0.5 p-1 text-[11px] font-medium text-[#70706B]"
        >
          <Search className="w-4 h-4 text-[#70706B]" />
          <span>Search</span>
        </button>

        <button
          onClick={() => {
            setIsMoreOpen(false);
            navigate('/ask');
          }}
          className={`flex flex-col items-center gap-0.5 p-1 text-[11px] font-medium transition-colors ${
            route === 'ask' ? 'text-[#1E3A8A]' : 'text-[#70706B]'
          }`}
        >
          <MessageSquareText className={`w-4 h-4 ${route === 'ask' ? 'text-[#2563EB]' : 'text-[#70706B]'}`} />
          <span>Ask AI</span>
        </button>

        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`flex flex-col items-center gap-0.5 p-1 text-[11px] font-medium transition-colors ${
            isMoreOpen || route === 'collections' || route === 'insights' || route === 'digests' || route === 'settings'
              ? 'text-[#1E3A8A]'
              : 'text-[#70706B]'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Sheet */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div
            className="bg-[#FAFAF8] rounded-t-2xl border-t border-[#E8E8E5] p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8A8A85]">
                More Navigation
              </span>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-md text-[#70706B] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  navigate('/collections');
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium text-left ${
                  route === 'collections' || route === 'collection-detail'
                    ? 'bg-[#EEF4FF] border-[#BFDBFE] text-[#1E3A8A]'
                    : 'bg-white border-[#E8E8E5] text-[#171717]'
                }`}
              >
                <FolderKanban className="w-4 h-4 text-[#2563EB]" />
                <span>Collections</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  navigate('/insights');
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium text-left ${
                  route === 'insights'
                    ? 'bg-[#EEF4FF] border-[#BFDBFE] text-[#1E3A8A]'
                    : 'bg-white border-[#E8E8E5] text-[#171717]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#6366F1]" />
                <span>Insights</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  navigate('/digests');
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium text-left ${
                  route === 'digests' || route === 'digest-detail'
                    ? 'bg-[#EEF4FF] border-[#BFDBFE] text-[#1E3A8A]'
                    : 'bg-white border-[#E8E8E5] text-[#171717]'
                }`}
              >
                <Mail className="w-4 h-4 text-[#4F46E5]" />
                <span>Digests</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  navigate('/settings');
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium text-left ${
                  route === 'settings'
                    ? 'bg-[#EEF4FF] border-[#BFDBFE] text-[#1E3A8A]'
                    : 'bg-white border-[#E8E8E5] text-[#171717]'
                }`}
              >
                <Settings className="w-4 h-4 text-[#70706B]" />
                <span>Settings</span>
              </button>
            </div>

            <button
              onClick={() => {
                setIsMoreOpen(false);
                navigate('/');
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F0F0EB] text-xs font-medium text-[#171717]"
            >
              <span>View Marketing Site</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#70706B]" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
