import React from 'react';
import {
  Home,
  Bookmark as BookmarkIcon,
  FolderKanban,
  Sparkles,
  MessageSquareText,
  Mail,
  Settings,
  RefreshCw,
  Search,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { UserProfile, ConnectedAccount } from '../types';

export type NavTab = 'home' | 'bookmarks' | 'collections' | 'insights' | 'ask-ai' | 'digests' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  profile: UserProfile | null;
  xAccount: ConnectedAccount | null;
  isSyncing: boolean;
  onSyncNow: () => void;
  onOpenSearch: () => void;
  onViewLanding?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  profile,
  xAccount,
  isSyncing,
  onSyncNow,
  onOpenSearch,
  onViewLanding,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'bookmarks', label: 'Bookmarks', icon: <BookmarkIcon className="w-4 h-4" /> },
    { id: 'collections', label: 'Collections', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'ask-ai', label: 'Ask AI', icon: <MessageSquareText className="w-4 h-4" />, badge: 'RAG' },
    { id: 'digests', label: 'Digests', icon: <Mail className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside
        id="desktop-sidebar"
        className="hidden md:flex flex-col w-64 shrink-0 bg-[#FAFAF8] border-r border-[#E8E8E5] h-screen sticky top-0 px-4 py-5 select-none"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#171717] text-[#FAFAF8] flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-[15px] tracking-tight text-[#171717]">Kortex</span>
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A85] font-medium ml-1.5 px-1 py-0.5 rounded bg-[#EDEDE9]">
                Intelligence
              </span>
            </div>
          </div>
          {onViewLanding && (
            <button
              id="view-landing-btn"
              onClick={onViewLanding}
              title="View Marketing Site"
              className="p-1.5 text-[#8A8A85] hover:text-[#171717] hover:bg-[#EDEDE9] rounded-md transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Button (CMD+K) */}
        <button
          id="global-search-trigger"
          onClick={onOpenSearch}
          className="flex items-center justify-between w-full px-3 py-2 mb-5 rounded-lg bg-[#FFFFFF] border border-[#E8E8E5] text-[#8A8A85] hover:text-[#171717] hover:border-[#D0D0CB] transition-all shadow-2xs text-xs font-normal"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#A0A09A]" />
            <span>Search bookmarks...</span>
          </span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F4F4F2] border border-[#E0E0DC] text-[#70706B]">
            ⌘K
          </kbd>
        </button>

        {/* Nav Items List */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#FFFFFF] text-[#171717] shadow-2xs border border-[#E8E8E5]'
                    : 'text-[#6B6B6B] hover:text-[#171717] hover:bg-[#F2F2EE]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-[#171717]' : 'text-[#8A8A85]'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-[#EBF0FF] text-[#2563EB]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync Status & Action */}
        <div className="p-3 bg-[#FFFFFF] rounded-xl border border-[#E8E8E5] mb-3 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-medium text-[#171717]">X Connected</span>
            </div>
            <span className="text-[10px] text-[#8A8A85]">
              {xAccount?.last_sync_at ? 'Synced' : 'Ready'}
            </span>
          </div>
          <button
            id="sync-now-sidebar-btn"
            disabled={isSyncing}
            onClick={onSyncNow}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#F7F7F5] hover:bg-[#EDEDE9] border border-[#E5E5E0] text-[11px] font-medium text-[#171717] transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 text-[#70706B] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Processing sync...' : 'Sync now'}</span>
          </button>
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center justify-between px-2 pt-2 border-t border-[#E8E8E5]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={profile?.display_name || 'User'}
              className="w-7 h-7 rounded-full object-cover border border-[#E0E0DC]"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#171717] truncate">{profile?.display_name || 'Faruk'}</p>
              <p className="text-[10px] text-[#8A8A85] truncate">@faruk</p>
            </div>
          </div>
          <div className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#EBF5EE] text-[#166534]">
            PRO
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-t border-[#E8E8E5] px-3 py-2 flex items-center justify-around"
      >
        {navItems.slice(0, 5).map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium ${
                isActive ? 'text-[#171717]' : 'text-[#8A8A85]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium ${
            currentTab === 'settings' ? 'text-[#171717]' : 'text-[#8A8A85]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </>
  );
};
