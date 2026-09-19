import React, { useState, useEffect } from 'react';
import {
  User,
  Share2,
  Sliders,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Unlink,
  Lock,
  Key,
  Mail,
  Calendar,
  AlertTriangle,
  Activity,
  Send,
  Eye,
  Globe,
} from 'lucide-react';
import { useDemoStore } from '../lib/store/demo-store';
import { api } from '../lib/api';
import { BillingSettingsSection } from '../components/BillingSettingsSection';
import { BackgroundReliabilitySection } from '../components/BackgroundReliabilitySection';

export const SettingsView: React.FC = () => {
  const {
    profile,
    updateProfile,
    bookmarkViewMode,
    setBookmarkViewMode,
    bookmarks,
    resetData,
    showToast,
    xStatus,
    syncProgress,
    syncXBookmarks,
    disconnectXAccount,
    refreshXStatus,
    addImportedBookmarks,
    digestSettings,
    updateDigestSettings,
    digests,
  } = useDemoStore();

  const [activeTab, setActiveTab] = useState<'account' | 'billing' | 'sources' | 'intelligence' | 'automation' | 'appearance' | 'data'>('account');
  const [digestFreq, setDigestFreq] = useState<'weekly' | 'monthly'>('weekly');
  const [summaryDetail, setSummaryDetail] = useState<'concise' | 'detailed'>('detailed');
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string | null>(null);

  // Sync tab with URL search parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'billing' || tabParam === 'subscription') {
      setActiveTab('billing');
    } else if (tabParam === 'automation' || tabParam === 'background') {
      setActiveTab('automation');
    }
  }, []);

  // Sources Tab State
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const callbackUrl = `${window.location.origin}/api/integrations/x/callback`;

  // Listen for OAuth messages from popup
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'X_AUTH_SUCCESS') {
        setIsConnecting(false);
        showToast(`Connected as @${event.data.data.username}`);
        await refreshXStatus();
        // Trigger sync right after connect
        syncXBookmarks();
      } else if (event.data?.type === 'X_AUTH_ERROR') {
        setIsConnecting(false);
        setConnectError(event.data.error || 'Authorization failed.');
        showToast('X connection was rejected or cancelled.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [refreshXStatus, showToast, syncXBookmarks]);

  const handleConnectX = async () => {
    setConnectError(null);
    setIsConnecting(true);

    try {
      const authData = await api.getXAuthUrl(profile?.user_id);

      if (authData.configured && authData.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2.5;

        const popup = window.open(
          authData.url,
          'x_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );

        if (!popup) {
          setIsConnecting(false);
          setConnectError('Popup blocked by browser. Please enable popups for this site.');
        }
      } else {
        setIsConnecting(false);
        setShowConfigHelper(true);
      }
    } catch (err: any) {
      setIsConnecting(false);
      setConnectError(err.message || 'Could not initiate connection.');
    }
  };

  const handleConnectTestStream = async () => {
    setIsConnecting(true);
    setShowConfigHelper(false);
    try {
      const testRes = await api.testConnectX('faruk', profile?.display_name || 'Faruk');
      if (testRes.success) {
        await refreshXStatus();
        showToast('Connected to test X stream');
        syncXBookmarks();
      }
    } catch (e) {
      showToast('Could not connect test stream');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectConfirm(false);
    await disconnectXAccount();
  };

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never synchronized';
    try {
      const date = new Date(timestamp);
      const diffMinutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookmarks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recallly-bookmarks-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported library as JSON.');
  };

  const handleExportMarkdown = () => {
    const mdContent = bookmarks
      .map(
        (b) => `## ${b.author_name} (@${b.author_username})\n*Saved: ${b.bookmark_created_at}* | *URL: ${b.url}*\n\n${b.content}\n\n**AI Insight:** ${b.ai_summary || 'N/A'}\n\n---`
      )
      .join('\n\n');
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recallly-library-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported library as Markdown.');
  };

  const handleReset = () => {
    if (window.confirm('Reset all demo state back to default fixtures?')) {
      resetData();
      showToast('Demo state reset to initial fixtures.');
    }
  };

  return (
    <div id="settings-view" className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8E8E5]">
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Settings</h1>
        <p className="text-xs sm:text-sm text-[#70706B] mt-0.5">
          Manage your account, source connections, and intelligence preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E8E8E5] pb-px overflow-x-auto scrollbar-none">
        <button
          id="tab-account"
          onClick={() => setActiveTab('account')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'account'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          Account
        </button>
        <button
          id="tab-billing"
          onClick={() => setActiveTab('billing')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'billing'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          <span>Billing & Plans</span>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              profile.plan === 'pro'
                ? 'bg-[#EEF4FF] text-[#2563EB]'
                : 'bg-[#F4F4F1] text-[#70706B]'
            }`}
          >
            {profile.plan}
          </span>
        </button>
        <button
          id="tab-sources"
          onClick={() => setActiveTab('sources')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'sources'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          Sources & Connections
        </button>
        <button
          onClick={() => setActiveTab('intelligence')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'intelligence'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          Intelligence & Digests
        </button>
        <button
          id="tab-automation"
          onClick={() => setActiveTab('automation')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'automation'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          <span>Background & Reliability</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'appearance'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          Appearance
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
            activeTab === 'data'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#70706B] hover:text-[#171717]'
          }`}
        >
          Export & Data
        </button>
      </div>

      {/* Tab 1: Account */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-5">
            <h2 className="text-sm font-bold text-[#171717]">Profile Information</h2>

            <div className="flex items-center gap-4">
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-16 h-16 rounded-full object-cover border border-[#E5E5E0]"
              />
              <div>
                <h3 className="text-base font-bold text-[#171717]">{profile.display_name}</h3>
                <p className="text-xs text-[#70706B]">{profile.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EEF4FF] text-[#2563EB]">
                    {profile.plan} Plan
                  </span>
                  <span className="text-[11px] text-[#8A8A85]">Active subscriber</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#F0F0EC]">
              <div>
                <label className="block text-xs font-medium text-[#70706B] mb-1">Display Name</label>
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => updateProfile({ display_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-[#171717]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#70706B] mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile.email}
                  className="w-full px-3 py-2 text-xs bg-[#F4F4F1] border border-[#E0E0DC] rounded-xl text-[#70706B] cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Billing & Plans */}
      {activeTab === 'billing' && <BillingSettingsSection />}

      {/* Tab 2: Sources */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#171717]">Connected Sources</h2>
                <p className="text-xs text-[#8A8A85]">
                  Recallly extracts and organizes bookmarks from your external accounts via official read-only APIs.
                </p>
              </div>
            </div>

            {/* Error banner if any */}
            {connectError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{connectError}</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">Please check popup permissions or try again.</p>
                </div>
              </div>
            )}

            {/* Reauthorization Alert if token revoked/expired */}
            {xStatus.connected && xStatus.reauthorization_required && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[#171717]">Re-authorization Required</span>
                    <span className="text-[11px] text-amber-800">
                      Your X connection token expired or was revoked. Please reconnect to resume automatic background syncing.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleConnectX}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  Reconnect X Now
                </button>
              </div>
            )}

            {/* X / Twitter Source Card */}
            <div className="p-5 rounded-2xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {xStatus.connected && xStatus.avatarUrl ? (
                    <img
                      src={xStatus.avatarUrl}
                      alt={xStatus.displayName || xStatus.username}
                      className="w-10 h-10 rounded-xl object-cover border border-[#E8E8E5] shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                      𝕏
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#171717]">X / Twitter</span>
                      {xStatus.connected ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[#8A8A85] bg-[#E8E8E5] px-2 py-0.5 rounded-md">
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#70706B] mt-0.5">
                      {xStatus.connected ? (
                        <>
                          <span className="font-medium text-[#171717]">@{xStatus.username}</span> • Last synchronized {formatLastSync(xStatus.last_successful_sync || xStatus.last_sync_at)}
                        </>
                      ) : (
                        'Sync bookmarks automatically using official read-only X OAuth 2.0 PKCE.'
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  {xStatus.connected ? (
                    <>
                      <button
                        id="settings-sync-x-btn"
                        onClick={syncXBookmarks}
                        disabled={syncProgress.isSyncing}
                        className="px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-xs font-semibold text-[#FAFAF8] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncProgress.isSyncing ? 'animate-spin' : ''}`} />
                        <span>{syncProgress.isSyncing ? 'Syncing...' : 'Sync now'}</span>
                      </button>

                      <button
                        id="settings-disconnect-x-btn"
                        onClick={() => setShowDisconnectConfirm(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] hover:border-rose-300 hover:text-rose-600 text-xs font-medium text-[#70706B] transition-colors cursor-pointer"
                        title="Disconnect X account"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      id="settings-connect-x-btn"
                      onClick={handleConnectX}
                      disabled={isConnecting}
                      className="px-4 py-2 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-xs font-semibold text-[#FAFAF8] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Connect X</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Cadence & Next Scheduled Sync Information */}
              {xStatus.connected && (
                <div className="pt-3 border-t border-[#E8E8E5] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#70706B] gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-medium text-[#171717]">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Cadence:</span>
                    </span>
                    <span className="font-semibold text-[#171717]">
                      {profile.plan === 'pro' ? 'Every 2 hours' : 'Every 24 hours'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-[#F4F4F1] text-[#70706B]">
                      {profile.plan}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[#70706B]">
                    <Calendar className="w-3.5 h-3.5 text-[#8A8A85]" />
                    <span>Next automatic sync:</span>
                    <span className="font-medium text-[#171717]">
                      {xStatus.next_sync_at
                        ? new Date(xStatus.next_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                        : 'Scheduled in background'}
                    </span>
                  </div>
                </div>
              )}

              {/* Sync Progress Bar */}
              {syncProgress.isSyncing && (
                <div className="p-3.5 rounded-xl bg-white border border-[#E0E0DC] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#171717] flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>{syncProgress.message}</span>
                    </span>
                    <span className="text-[11px] text-[#8A8A85]">
                      Stage: {syncProgress.stage}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-600 transition-all duration-300 rounded-full ${
                        syncProgress.stage === 'fetching' ? 'w-1/3' : syncProgress.stage === 'organizing' ? 'w-2/3' : 'w-full'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Disconnect confirmation dialog inline */}
              {showDisconnectConfirm && (
                <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-2.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Unlink className="w-4 h-4 text-rose-600" />
                    <span>Disconnect X account?</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    This will remove stored authorization tokens. Previously imported bookmarks will remain in your library.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Yes, disconnect
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-800 font-medium text-xs hover:bg-rose-100/50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Developer Setup & OAuth Information */}
            <div className="p-5 rounded-2xl border border-[#E8E8E5] bg-[#FFFFFF] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#70706B]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#70706B]">
                    OAuth 2.0 PKCE Configuration
                  </h3>
                </div>
                <button
                  onClick={() => setShowConfigHelper((prev) => !prev)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showConfigHelper ? 'Hide instructions' : 'View instructions'}
                </button>
              </div>

              <p className="text-xs text-[#70706B] leading-relaxed">
                Recallly integrates with X using official OAuth 2.0 with PKCE (RFC 7636). Tokens are stored encrypted server-side with AES-256-GCM. We strictly request read-only permissions: <code className="bg-[#F4F4F1] px-1 py-0.5 rounded text-[11px] font-mono text-[#171717]">tweet.read</code>, <code className="bg-[#F4F4F1] px-1 py-0.5 rounded text-[11px] font-mono text-[#171717]">users.read</code>, <code className="bg-[#F4F4F1] px-1 py-0.5 rounded text-[11px] font-mono text-[#171717]">bookmark.read</code>, <code className="bg-[#F4F4F1] px-1 py-0.5 rounded text-[11px] font-mono text-[#171717]">offline.access</code>.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8A8A85] uppercase tracking-wider">
                  Redirect / Callback URI
                </label>
                <div className="flex items-center gap-2 p-2 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl">
                  <code className="text-xs font-mono text-[#171717] flex-1 truncate">
                    {callbackUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyCallbackUrl}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#E0E0DC] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                  >
                    {copiedCallback ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#70706B]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {showConfigHelper && (
                <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] space-y-3 text-xs">
                  <h4 className="font-semibold text-[#171717]">Steps to set up your X Developer App:</h4>
                  <ol className="list-decimal list-inside space-y-1.5 text-[#70706B] leading-relaxed">
                    <li>Visit <a href="https://developer.x.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">developer.x.com</a> and open your project app.</li>
                    <li>Under User Authentication Settings, click <strong>Edit</strong>.</li>
                    <li>Select <strong>OAuth 2.0</strong>, Type: <strong>Confidential client</strong> or <strong>Web App</strong>.</li>
                    <li>Paste the Callback URI shown above into <strong>Redirect URL</strong>.</li>
                    <li>Add <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">X_CLIENT_ID</code> and <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px]">X_CLIENT_SECRET</code> to your AI Studio environment settings.</li>
                  </ol>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleConnectTestStream}
                      className="py-2 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Switch to Sample Verified Test Stream</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Future Sources Roadmap */}
          <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-[#171717]">Additional Sources</h2>
            <p className="text-xs text-[#8A8A85]">
              Modular source architecture designed to import knowledge from everywhere you learn.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Reddit', desc: 'Saved posts, comments, and discussions' },
                { name: 'LinkedIn', desc: 'Saved articles, frameworks, and career insights' },
                { name: 'YouTube', desc: 'Watch later and video notes transcriptions' },
                { name: 'Substack', desc: 'Newsletter highlights and saved essays' },
                { name: 'Web & Articles', desc: 'Browser extension clipper for articles' },
              ].map((src) => (
                <div
                  key={src.name}
                  className="p-3.5 rounded-xl border border-[#E8E8E5] bg-[#FFFFFF] flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-semibold text-[#171717]">{src.name}</span>
                    <p className="text-[11px] text-[#8A8A85]">{src.desc}</p>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-[#8A8A85] bg-[#F4F4F1] px-2 py-0.5 rounded border border-[#E0E0DC]">
                    Coming soon
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Intelligence Preferences */}
      {activeTab === 'intelligence' && (
        <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-6">
          <h2 className="text-base font-bold text-[#171717]">Synthesis & Intelligence</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EC]">
              <div>
                <span className="text-xs font-semibold text-[#171717] block">
                  Digest Frequency
                </span>
                <span className="text-xs text-[#8A8A85]">
                  How often AI synthesizes your saved bookmarks into a curated digest
                </span>
              </div>
              <div className="flex items-center p-0.5 bg-[#F4F4F1] rounded-lg border border-[#E0E0DC]">
                <button
                  onClick={() => setDigestFreq('weekly')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    digestFreq === 'weekly' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setDigestFreq('monthly')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    digestFreq === 'monthly' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EC]">
              <div>
                <span className="text-xs font-semibold text-[#171717] block">
                  AI Summary Detail
                </span>
                <span className="text-xs text-[#8A8A85]">
                  Depth of takeaway summaries generated on imported bookmarks
                </span>
              </div>
              <div className="flex items-center p-0.5 bg-[#F4F4F1] rounded-lg border border-[#E0E0DC]">
                <button
                  onClick={() => setSummaryDetail('concise')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    summaryDetail === 'concise' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'
                  }`}
                >
                  Concise
                </button>
                <button
                  onClick={() => setSummaryDetail('detailed')}
                  className={`px-3 py-1 rounded-md text-xs font-medium ${
                    summaryDetail === 'detailed' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'
                  }`}
                >
                  Detailed
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#171717] block">
                  Automatic Categorization
                </span>
                <span className="text-xs text-[#8A8A85]">
                  Cluster new bookmarks into topic buckets automatically
                </span>
              </div>
              <button
                onClick={() => setAutoCategorize(!autoCategorize)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  autoCategorize ? 'bg-[#171717]' : 'bg-[#D0D0CB]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    autoCategorize ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: Email Delivery & Schedule */}
          <div className="pt-6 border-t border-[#F0F0EC] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#171717] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Scheduled Digest Email Delivery</span>
                </h3>
                <p className="text-xs text-[#8A8A85]">
                  Receive an executive briefing with high-signal takeaways delivered to your inbox on schedule.
                </p>
              </div>

              <button
                onClick={() => updateDigestSettings({ enabled: !digestSettings.enabled })}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  digestSettings.enabled ? 'bg-[#171717]' : 'bg-[#D0D0CB]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    digestSettings.enabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
              <div>
                <label className="block text-xs font-medium text-[#70706B] mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={digestSettings.email || profile.email}
                  onChange={(e) => updateDigestSettings({ email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E0E0DC] rounded-xl text-[#171717]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#70706B] mb-1">
                  Delivery Day & Time
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={digestSettings.delivery_day || 'Sunday'}
                    onChange={(e) => updateDigestSettings({ delivery_day: e.target.value })}
                    className="px-2.5 py-2 text-xs bg-white border border-[#E0E0DC] rounded-xl text-[#171717]"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>

                  <select
                    value={digestSettings.delivery_time || '09:00'}
                    onChange={(e) => updateDigestSettings({ delivery_time: e.target.value })}
                    className="px-2.5 py-2 text-xs bg-white border border-[#E0E0DC] rounded-xl text-[#171717]"
                  >
                    {['06:00', '07:00', '08:00', '09:00', '10:00', '12:00', '17:00', '18:00', '20:00'].map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#70706B] mb-1">
                  Timezone (IANA Canonical)
                </label>
                <select
                  value={digestSettings.timezone || 'UTC'}
                  onChange={(e) => updateDigestSettings({ timezone: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E0E0DC] rounded-xl text-[#171717]"
                >
                  {[
                    'UTC',
                    'America/New_York',
                    'America/Chicago',
                    'America/Denver',
                    'America/Los_Angeles',
                    'Europe/London',
                    'Europe/Paris',
                    'Europe/Berlin',
                    'Asia/Tokyo',
                    'Asia/Singapore',
                    'Australia/Sydney',
                  ].map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <p className="text-[10px] text-[#8A8A85] mt-1">
                  Accurate IANA timezone evaluation ensures digests arrive in your morning inbox regardless of daylight saving shifts.
                </p>
              </div>
            </div>

            {/* Test Email Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!digests || digests.length === 0) {
                    showToast('Please generate at least one digest before sending test email.');
                    return;
                  }
                  setIsSendingTestEmail(true);
                  try {
                    const res = await api.deliverDigestEmail(digests[0].id);
                    showToast(`Digest email delivered via ${res.provider || 'Resend'} to ${res.recipientEmail}!`);
                  } catch (e: any) {
                    showToast(`Delivery failed: ${e.message}`);
                  } finally {
                    setIsSendingTestEmail(false);
                  }
                }}
                disabled={isSendingTestEmail}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E0E0DC] hover:border-[#D0D0CB] text-xs font-semibold text-[#171717] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
              >
                {isSendingTestEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Send Test Digest Email</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!digests || digests.length === 0) {
                    showToast('Generate a digest first to preview its email layout.');
                    return;
                  }
                  try {
                    const res = await fetch(`/api/digests/${digests[0].id}/email-preview`);
                    if (res.ok) {
                      const html = await res.text();
                      setEmailPreviewHtml(html);
                      setEmailPreviewOpen(true);
                    } else {
                      showToast('Could not load email template');
                    }
                  } catch (e) {
                    showToast('Error previewing email');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E0E0DC] hover:border-[#D0D0CB] text-xs font-semibold text-[#171717] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-[#70706B]" />
                <span>Preview Email Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Background Automation & Reliability */}
      {activeTab === 'automation' && <BackgroundReliabilitySection />}

      {/* Email Preview Modal */}
      {emailPreviewOpen && emailPreviewHtml && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden border border-[#E8E8E5]">
            <div className="p-4 border-b border-[#E8E8E5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#171717]">Digest Email Preview</h3>
              </div>
              <button
                onClick={() => setEmailPreviewOpen(false)}
                className="text-xs font-semibold text-[#70706B] hover:text-[#171717] px-2.5 py-1 rounded-lg hover:bg-[#F4F4F1]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-4">
              <iframe
                title="Email Preview"
                srcDoc={emailPreviewHtml}
                className="w-full h-[600px] border border-[#E0E0DC] rounded-xl bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Appearance */}
      {activeTab === 'appearance' && (
        <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-5">
          <h2 className="text-base font-bold text-[#171717]">Library Appearance</h2>

          <div className="flex items-center justify-between pb-3 border-b border-[#F0F0EC]">
            <div>
              <span className="text-xs font-semibold text-[#171717] block">
                Default Bookmark Layout
              </span>
              <span className="text-xs text-[#8A8A85]">
                Switch between spacious comfortable rows or high-density rows
              </span>
            </div>
            <div className="flex items-center p-0.5 bg-[#F4F4F1] rounded-lg border border-[#E0E0DC]">
              <button
                onClick={() => setBookmarkViewMode('comfortable')}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  bookmarkViewMode === 'comfortable' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'
                }`}
              >
                Comfortable
              </button>
              <button
                onClick={() => setBookmarkViewMode('compact')}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  bookmarkViewMode === 'compact' ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'
                }`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Export & Data */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-[#171717]">Export Your Library</h2>
            <p className="text-xs text-[#8A8A85]">
              You own your saved knowledge. Download all bookmarks, topics, and AI summaries anytime.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#70706B]" />
                <span>Export as JSON</span>
              </button>

              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] border border-[#E8E8E5] hover:border-[#D0D0CB] text-xs font-medium text-[#171717] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#70706B]" />
                <span>Export as Markdown (.md)</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-[#FFFFFF] border border-rose-200 rounded-2xl shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-rose-700">Demo State Reset</h2>
            <p className="text-xs text-[#70706B]">
              Restore all fixtures, bookmarks, and collections back to the initial demo baseline.
            </p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
