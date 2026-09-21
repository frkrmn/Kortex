import React from 'react';
import {
  Home,
  Bookmark as BookmarkIcon,
  FolderKanban,
  Sparkles,
  MessageSquareText,
  Mail,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from '../lib/router';
import { useDemoStore } from '../lib/store/demo-store';
import { DEFAULT_TRIAL_DAYS } from '../config/plans';

interface AppSidebarProps {
  onOpenSearch: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ onOpenSearch }) => {
  const { route, navigate } = useRouter();
  const { profile, sidebarCollapsed, setSidebarCollapsed } = useDemoStore();

  const navItems = [
    { id: 'dashboard', label: 'Home', path: '/dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'bookmarks', label: 'Bookmarks', path: '/bookmarks', icon: <BookmarkIcon className="w-4 h-4" /> },
    { id: 'collections', label: 'Collections', path: '/collections', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'ask', label: 'Ask AI', path: '/ask', icon: <MessageSquareText className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', path: '/insights', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'digests', label: 'Digests', path: '/digests', icon: <Mail className="w-4 h-4" /> },
  ];

  const isCurrentActive = (itemRoute: string) => {
    if (itemRoute === 'dashboard') return route === 'dashboard';
    if (itemRoute === 'bookmarks') return route === 'bookmarks' || route === 'bookmark-detail';
    if (itemRoute === 'collections') return route === 'collections' || route === 'collection-detail';
    if (itemRoute === 'ask') return route === 'ask';
    if (itemRoute === 'insights') return route === 'insights';
    if (itemRoute === 'digests') return route === 'digests' || route === 'digest-detail';
    return false;
  };

  return (
    <aside
      id="app-sidebar"
      className={`hidden md:flex flex-col shrink-0 bg-[#FAFAF8] border-r border-[#E8E8E5] h-screen sticky top-0 transition-all duration-200 z-30 select-none ${
        sidebarCollapsed ? 'w-16 px-2 py-4' : 'w-[230px] px-3.5 py-4'
      }`}
    >
      {/* Brand Header */}
      <div className={`flex items-center mb-5 ${sidebarCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
          title="Recallly"
        >
          <div className="w-7 h-7 rounded-lg bg-[#171717] text-[#FAFAF8] flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:bg-[#2A2A2A] transition-colors">
            <Layers className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-[#171717] leading-none">
                Recallly
              </span>
              <span className="text-[10px] text-[#8A8A85] tracking-tight font-medium mt-0.5">
                Personal Library
              </span>
            </div>
          )}
        </button>

        <button
          id="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded-md text-[#8A8A85] hover:text-[#171717] hover:bg-[#EFEFEA] transition-colors cursor-pointer"
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Global Search Trigger (CMD+K) */}
      <button
        id="sidebar-search-btn"
        onClick={onOpenSearch}
        title="Search bookmarks (⌘K)"
        className={`flex items-center mb-4 rounded-lg bg-[#FFFFFF] border border-[#E8E8E5] text-[#8A8A85] hover:text-[#171717] hover:border-[#D0D0CB] transition-all shadow-2xs text-xs cursor-pointer ${
          sidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-1.5 w-full'
        }`}
      >
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-[#8A8A85]" />
          {!sidebarCollapsed && <span className="font-normal text-xs text-[#70706B]">Search...</span>}
        </div>
        {!sidebarCollapsed && (
          <kbd className="text-[10px] font-mono px-1 py-0.5 rounded bg-[#F4F4F1] border border-[#E2E2DC] text-[#70706B] leading-none">
            ⌘K
          </kbd>
        )}
      </button>

      {/* Navigation Links */}
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const active = isCurrentActive(item.id);
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => navigate(item.path)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
              } ${
                active
                  ? 'bg-[#EEF4FF] text-[#1E3A8A] font-semibold'
                  : 'text-[#5C5C58] hover:text-[#171717] hover:bg-[#F2F2EE]'
              }`}
            >
              <span className={active ? 'text-[#2563EB]' : 'text-[#70706B]'}>
                {item.icon}
              </span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="my-3 border-t border-[#E8E8E5]" />

      {/* Bottom Section: Settings & User Profile */}
      <div className="space-y-1.5">
        {/* Settings button */}
        <button
          id="nav-settings"
          onClick={() => navigate('/settings')}
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'
          } ${
            route === 'settings'
              ? 'bg-[#EEF4FF] text-[#1E3A8A] font-semibold'
              : 'text-[#5C5C58] hover:text-[#171717] hover:bg-[#F2F2EE]'
          }`}
        >
          <Settings className={`w-4 h-4 ${route === 'settings' ? 'text-[#2563EB]' : 'text-[#70706B]'}`} />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>

        {/* View Marketing / Landing */}
        <button
          onClick={() => navigate('/')}
          title={sidebarCollapsed ? 'Marketing Site' : undefined}
          className={`w-full flex items-center rounded-lg text-xs font-medium transition-colors cursor-pointer text-[#8A8A85] hover:text-[#171717] hover:bg-[#F2F2EE] ${
            sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-1.5'
          }`}
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            {!sidebarCollapsed && <span className="text-[11px]">Marketing Site</span>}
          </div>
          {!sidebarCollapsed && <ChevronRight className="w-3 h-3" />}
        </button>

        {/* Upgrade Callout for Free Tier */}
        {profile.plan !== 'pro' && !sidebarCollapsed && (
          <button
            id="sidebar-upgrade-cta"
            onClick={() => navigate('/settings?tab=billing')}
            className="w-full p-2.5 rounded-xl bg-gradient-to-br from-[#EEF4FF] to-[#E0E7FF] border border-[#C7D2FE] text-left hover:border-[#A5B4FC] transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E3A8A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                Upgrade to Pro
              </span>
              <span className="text-[9px] font-bold text-[#1D4ED8] bg-white/80 px-1.5 py-0.5 rounded shadow-2xs">
                {DEFAULT_TRIAL_DAYS}d Trial
              </span>
            </div>
            <p className="text-[10px] text-[#3B82F6] mt-1 leading-tight">
              Automatic X sync, semantic search & weekly digests.
            </p>
          </button>
        )}

        {/* User Card */}
        <div
          onClick={() => navigate('/settings?tab=billing')}
          title="Account profile & billing"
          className={`flex items-center rounded-lg p-1.5 hover:bg-[#F0F0EB] transition-colors cursor-pointer ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-7 h-7 rounded-full object-cover border border-[#E0E0DC] shrink-0"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium text-[#171717] truncate leading-tight">
                  {profile.display_name}
                </p>
                <p className="text-[10px] text-[#8A8A85] truncate leading-tight">
                  {profile.email}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                profile.plan === 'pro'
                  ? 'bg-[#EEF4FF] text-[#2563EB]'
                  : 'bg-[#F4F4F1] text-[#70706B]'
              }`}
            >
              {profile.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
};
