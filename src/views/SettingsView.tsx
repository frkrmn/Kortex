import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { BillingSettingsSection } from '../components/BillingSettingsSection';
import { useAuth } from '../lib/auth/auth-context';
import { api } from '../lib/api';
import { useRouter } from '../lib/router';
import { SETTINGS_TABS, isCanonicalSettingsTab, resolveSettingsTab, settingsTabUrl } from '../lib/settings';
import { useDemoStore } from '../lib/store/demo-store';

function formatLastSync(timestamp?: string) {
  if (!timestamp) return 'No successful sync yet';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Sync time unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export const SettingsView: React.FC = () => {
  const { profile, refreshSession, isLoading: isAuthLoading, authError } = useAuth();
  const { searchParams, navigate } = useRouter();
  const {
    bookmarkViewMode, setBookmarkViewMode, showToast, xStatus, syncProgress,
    syncXBookmarks, disconnectXAccount, refreshXStatus, addImportedBookmarks,
  } = useDemoStore();

  const rawTab = searchParams.get('tab');
  const activeTab = resolveSettingsTab(rawTab);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [sourceLoadState, setSourceLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [isImportingHistory, setIsImportingHistory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const disconnectConfirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setDisplayName(profile?.display_name || ''), [profile?.display_name]);

  useEffect(() => {
    if (!rawTab || isCanonicalSettingsTab(rawTab)) return;
    navigate(settingsTabUrl(resolveSettingsTab(rawTab)), { replace: true });
  }, [navigate, rawTab]);

  useEffect(() => setHistoryHasMore(Boolean(xStatus.hasPendingImport)), [xStatus.hasPendingImport]);

  useEffect(() => {
    if (!showDisconnectConfirm) return;
    disconnectConfirmRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowDisconnectConfirm(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [showDisconnectConfirm]);

  useEffect(() => {
    if (activeTab !== 'sources') return;
    let cancelled = false;
    setSourceLoadState('loading');
    void refreshXStatus().then(ok => {
      if (!cancelled) setSourceLoadState(ok ? 'ready' : 'error');
    });
    return () => { cancelled = true; };
  }, [activeTab, profile?.user_id, refreshXStatus]);

  useEffect(() => {
    const handleResult = async (data: unknown) => {
      if (!isConnecting || !data || typeof data !== 'object') return;
      const result = data as { type?: string; data?: { username?: string }; error?: string };
      if (result.type === 'X_AUTH_SUCCESS') {
        setIsConnecting(false);
        setConnectError(null);
        await refreshXStatus();
        showToast(result.data?.username ? `Connected as @${result.data.username}` : 'X account connected');
      } else if (result.type === 'X_AUTH_ERROR') {
        setIsConnecting(false);
        setConnectError(result.error || 'X authorization was cancelled or rejected.');
      }
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin) void handleResult(event.data);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'kortex_x_oauth_result' || !event.newValue) return;
      try { void handleResult(JSON.parse(event.newValue)); } catch { /* Ignore malformed cross-window data. */ }
      localStorage.removeItem('kortex_x_oauth_result');
    };
    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isConnecting, refreshXStatus, showToast]);

  const initials = useMemo(() => {
    const value = profile?.display_name || profile?.email || 'R';
    return value.trim().slice(0, 2).toUpperCase();
  }, [profile?.display_name, profile?.email]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = displayName.trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.length > 80) {
      setProfileMessage({ kind: 'error', text: 'Display name must be between 1 and 80 characters.' });
      return;
    }
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await api.updateProfile({ display_name: normalized });
      await refreshSession();
      setDisplayName(updated.display_name);
      setProfileMessage({ kind: 'success', text: 'Profile saved.' });
    } catch {
      setProfileMessage({ kind: 'error', text: 'Your profile could not be saved. Please try again.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const connectX = async () => {
    setConnectError(null);
    setIsConnecting(true);
    try {
      const auth = await api.getXAuthUrl();
      if (!auth.configured || !auth.url) throw new Error('X connection is temporarily unavailable.');
      const width = 600;
      const height = 700;
      const popup = window.open(auth.url, 'x_oauth_popup',
        `width=${width},height=${height},left=${window.screenX + (window.outerWidth - width) / 2},top=${window.screenY + (window.outerHeight - height) / 2.5},status=no,resizable=yes`);
      if (!popup) throw new Error('Your browser blocked the X authorization window. Allow popups and try again.');
    } catch (error) {
      setIsConnecting(false);
      setConnectError(error instanceof Error ? error.message : 'Could not start the X connection.');
    }
  };

  const disconnectX = async () => {
    setShowDisconnectConfirm(false);
    const disconnected = await disconnectXAccount();
    if (!disconnected) setConnectError('X could not be disconnected. Your existing connection is unchanged.');
  };

  const runHistoricalImport = async () => {
    setIsImportingHistory(true);
    try {
      const result = await api.syncX({ historical: true, continueImport: historyHasMore });
      setHistoryHasMore(Boolean(result.hasMore));
      if (result.items.length) addImportedBookmarks(result.items);
      showToast(result.historicalLimitReached
        ? `Imported ${result.addedCount} bookmarks. X's current history window has been reached.`
        : `Imported ${result.addedCount} new bookmark(s).`);
      await refreshXStatus();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Historical import could not complete.');
    } finally {
      setIsImportingHistory(false);
    }
  };

  const exportData = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await api.exportData();
      showToast('Recallly data export downloaded.');
    } catch {
      setExportError('Your export could not be generated. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isAuthLoading) {
    return <div className="flex min-h-48 items-center justify-center" role="status"><Loader2 className="h-5 w-5 animate-spin text-[#70706B]" /><span className="sr-only">Loading settings</span></div>;
  }
  if (!profile) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">{authError || 'Your account settings could not be loaded. Sign in again and retry.'}</div>;

  return (
    <div id="settings-view" className="mx-auto max-w-4xl space-y-6 pb-24">
      <div className="border-b border-[#E8E8E5] pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">Settings</h1>
        <p className="mt-0.5 text-xs text-[#70706B] sm:text-sm">Manage your account, X connection, billing, and local display preferences.</p>
      </div>

      <div role="tablist" aria-label="Settings sections" className="flex items-center gap-1 overflow-x-auto border-b border-[#E8E8E5] pb-px scrollbar-none">
        {SETTINGS_TABS.map(tab => (
          <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1}
            aria-controls={`settings-panel-${tab.id}`} onClick={() => navigate(settingsTabUrl(tab.id))}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const current = SETTINGS_TABS.findIndex(item => item.id === tab.id);
              const target = event.key === 'Home' ? 0 : event.key === 'End' ? SETTINGS_TABS.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + SETTINGS_TABS.length) % SETTINGS_TABS.length;
              const next = SETTINGS_TABS[target];
              navigate(settingsTabUrl(next.id));
              requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
            }}
            className={`min-h-10 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab.id ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#70706B] hover:text-[#171717]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'account' && (
        <section id="settings-panel-account" role="tabpanel" aria-labelledby="tab-account" className="rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs sm:p-6">
          <h2 className="text-sm font-bold text-[#171717]">Profile information</h2>
          <div className="mt-5 flex min-w-0 items-center gap-4">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-14 w-14 shrink-0 rounded-full border border-[#E5E5E0] object-cover" />
              : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#171717] text-sm font-bold text-white" aria-hidden="true">{initials}</div>}
            <div className="min-w-0"><p className="truncate text-base font-bold text-[#171717]">{profile.display_name}</p><p className="truncate text-xs text-[#70706B]">{profile.email}</p></div>
          </div>
          <form onSubmit={saveProfile} className="mt-5 grid grid-cols-1 gap-4 border-t border-[#F0F0EC] pt-5 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-display-name" className="mb-1 block text-xs font-medium text-[#70706B]">Display name</label>
              <input id="settings-display-name" value={displayName} maxLength={80} autoComplete="name" onChange={event => setDisplayName(event.target.value)} className="w-full rounded-xl border border-[#E0E0DC] bg-[#FAFAF8] px-3 py-2 text-sm text-[#171717] focus:border-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/10" />
            </div>
            <div>
              <label htmlFor="settings-email" className="mb-1 block text-xs font-medium text-[#70706B]">Email address</label>
              <input id="settings-email" type="email" readOnly value={profile.email} aria-describedby="settings-email-help" className="w-full cursor-not-allowed rounded-xl border border-[#E0E0DC] bg-[#F4F4F1] px-3 py-2 text-sm text-[#70706B]" />
              <p id="settings-email-help" className="mt-1 text-[11px] text-[#8A8A85]">Managed by your sign-in provider.</p>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button type="submit" disabled={isSavingProfile || displayName.trim() === profile.display_name} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isSavingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save profile</button>
              {profileMessage && <p role="status" className={`text-xs ${profileMessage.kind === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{profileMessage.text}</p>}
            </div>
          </form>
        </section>
      )}

      {activeTab === 'billing' && <section id="settings-panel-billing" role="tabpanel" aria-labelledby="tab-billing"><BillingSettingsSection /></section>}

      {activeTab === 'sources' && (
        <section id="settings-panel-sources" role="tabpanel" aria-labelledby="tab-sources" className="space-y-5 rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs sm:p-6">
          <div><h2 className="text-base font-bold text-[#171717]">Connected sources</h2><p className="mt-1 text-xs text-[#70706B]">Connect X through its official read-only API. Opening this page does not contact X.</p></div>
          {sourceLoadState === 'loading' && <div role="status" className="flex items-center gap-2 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] p-4 text-xs text-[#70706B]"><Loader2 className="h-4 w-4 animate-spin" /> Loading connection state…</div>}
          {(sourceLoadState === 'error' || connectError) && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{connectError || 'Connection state could not be loaded. Retry without leaving this page.'}</span>{!connectError && <button type="button" className="ml-auto font-semibold underline" onClick={() => void refreshXStatus().then(ok => setSourceLoadState(ok ? 'ready' : 'error'))}>Retry</button>}</div>
          )}
          {sourceLoadState === 'ready' && (
            <div className="space-y-4 rounded-2xl border border-[#E8E8E5] bg-[#FAFAF8] p-4 sm:p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  {xStatus.connected && xStatus.avatarUrl ? <img src={xStatus.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl border border-[#E8E8E5] object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171717] font-bold text-white" aria-hidden="true">𝕏</div>}
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#171717]">X / Twitter</h3><span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${xStatus.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-[#E8E8E5] text-[#70706B]'}`}>{xStatus.connected ? 'Connected' : 'Disconnected'}</span></div><p className="mt-0.5 truncate text-xs text-[#70706B]">{xStatus.connected ? `@${xStatus.username || 'account'} · Last successful sync: ${formatLastSync(xStatus.last_successful_sync || xStatus.last_sync_at)}` : 'Connect X to import the latest bookmarks available through its official API.'}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {xStatus.connected ? <><button id="settings-sync-x-btn" type="button" onClick={() => void syncXBookmarks()} disabled={syncProgress.isSyncing} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#171717] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${syncProgress.isSyncing ? 'animate-spin' : ''}`} />{syncProgress.isSyncing ? 'Syncing…' : 'Sync now'}</button><button id="settings-disconnect-x-btn" type="button" onClick={() => setShowDisconnectConfirm(true)} className="min-h-10 rounded-xl border border-[#E0E0DC] bg-white px-3.5 py-2 text-xs font-medium text-[#70706B] hover:border-rose-300 hover:text-rose-700">Disconnect</button></>
                    : <button id="settings-connect-x-btn" type="button" onClick={connectX} disabled={isConnecting} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{isConnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{isConnecting ? 'Connecting…' : 'Connect X'}</button>}
                </div>
              </div>
              {xStatus.connected && xStatus.reauthorization_required && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Your X authorization expired or was revoked. Reconnect before your next manual sync.</span><button type="button" onClick={connectX} className="rounded-lg bg-amber-700 px-3 py-2 font-semibold text-white">Reconnect X</button></div>}
              {xStatus.connected && xStatus.lastSyncError && !xStatus.reauthorization_required && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">The last sync did not complete. Your existing library is unchanged.</div>}
              {xStatus.connected && <div className="grid grid-cols-1 gap-3 border-t border-[#E8E8E5] pt-4 text-xs sm:grid-cols-3"><div><span className="text-[#70706B]">Sync mode</span><p className="font-semibold text-[#171717]">Manual</p></div><div><span className="text-[#70706B]">Historical import</span><p className="font-semibold text-[#171717]">{xStatus.initialImport?.importedCount?.toLocaleString() || 0} imported</p></div><div><span className="text-[#70706B]">Ongoing sync</span><p className="font-semibold text-[#171717]">{(xStatus.ongoingImportedCount || 0).toLocaleString()} imported after connection</p></div></div>}
              {xStatus.connected && <div className="flex flex-col gap-3 border-t border-[#E8E8E5] pt-4 text-xs text-[#70706B] sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl">Initial import is limited to bookmarks X currently makes available through its official API. Recallly cannot guarantee complete historical availability.</p><button type="button" disabled={isImportingHistory} onClick={runHistoricalImport} className="min-h-10 shrink-0 rounded-lg border border-[#D0D0CB] bg-white px-3 py-2 font-semibold text-[#171717] disabled:opacity-50">{isImportingHistory ? 'Importing…' : historyHasMore ? 'Continue available import' : 'Import available history'}</button></div>}
              {syncProgress.isSyncing && <div role="status" className="flex items-center gap-2 rounded-xl border border-[#E0E0DC] bg-white p-3 text-xs text-[#171717]"><Loader2 className="h-4 w-4 animate-spin text-blue-600" /> {syncProgress.message}</div>}
              {showDisconnectConfirm && <div role="alertdialog" aria-modal="true" aria-labelledby="disconnect-x-title" aria-describedby="disconnect-x-description" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900"><h4 id="disconnect-x-title" className="flex items-center gap-2 font-semibold"><Unlink className="h-4 w-4" />Disconnect X account?</h4><p id="disconnect-x-description" className="mt-2">Stored authorization tokens will be removed. Imported bookmarks and their enrichment remain in Recallly.</p><div className="mt-3 flex gap-2"><button ref={disconnectConfirmRef} type="button" onClick={disconnectX} className="rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white">Disconnect</button><button type="button" onClick={() => setShowDisconnectConfirm(false)} className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-medium">Cancel</button></div></div>}
            </div>
          )}
        </section>
      )}

      {activeTab === 'appearance' && (
        <section id="settings-panel-appearance" role="tabpanel" aria-labelledby="tab-appearance" className="rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-[#171717]">Library appearance</h2><p className="mt-1 text-xs text-[#70706B]">Choose the bookmark density used on this device.</p>
          <fieldset className="mt-5 border-t border-[#F0F0EC] pt-5"><legend className="text-xs font-semibold text-[#171717]">Default bookmark layout</legend><div className="mt-3 inline-flex rounded-lg border border-[#E0E0DC] bg-[#F4F4F1] p-0.5">{(['comfortable', 'compact'] as const).map(mode => <button key={mode} type="button" aria-pressed={bookmarkViewMode === mode} onClick={() => setBookmarkViewMode(mode)} className={`min-h-10 rounded-md px-3 py-2 text-xs font-medium capitalize ${bookmarkViewMode === mode ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'}`}>{mode}</button>)}</div></fieldset>
        </section>
      )}

      {activeTab === 'data' && (
        <section id="settings-panel-data" role="tabpanel" aria-labelledby="tab-data" className="rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-[#171717]">Export your Recallly data</h2><p className="mt-1 max-w-2xl text-xs text-[#70706B]">Download an authenticated JSON export containing your profile, saved items, completed AI enrichment, collections, and digests. The export does not contact X or Gemini.</p>
          {exportError && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{exportError}</p>}
          <button type="button" onClick={exportData} disabled={isExporting} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D0D0CB] bg-white px-4 py-2 text-xs font-semibold text-[#171717] disabled:opacity-50">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{isExporting ? 'Preparing export…' : 'Download JSON export'}</button>
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#FAFAF8] p-4 text-xs text-[#70706B]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p>Account deletion is not offered as an incomplete in-app action. Contact support for an account-level request; no data is deleted from this page.</p></div>
        </section>
      )}
    </div>
  );
};
