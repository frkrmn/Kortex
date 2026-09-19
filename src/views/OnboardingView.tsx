import React, { useState, useEffect } from 'react';
import { Layers, ArrowRight, CheckCircle2, Globe, Sparkles, Loader2, Info, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth/auth-context';
import { useDemoStore } from '../lib/store/demo-store';
import { api } from '../lib/api';

export const OnboardingView: React.FC = () => {
  const { navigate } = useRouter();
  const { profile, user, completeOnboarding } = useAuth();
  const { addImportedBookmarks, refreshXStatus } = useDemoStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 2 Form State
  const initialName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (user?.email ? user.email.split('@')[0] : '');

  const [name, setName] = useState(initialName);
  const detectedTz =
    profile?.timezone ||
    (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
  const [timezone, setTimezone] = useState(detectedTz);

  // Step 3 X Integration State
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showConfigHelper, setShowConfigHelper] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [connectedXUser, setConnectedXUser] = useState<{
    username: string;
    displayName: string;
    avatarUrl?: string;
  } | null>(null);

  // Import Progress State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressMessage, setImportProgressMessage] = useState('');
  const [importStage, setImportStage] = useState<'fetching' | 'organizing' | 'indexing' | 'complete' | 'idle'>('idle');
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const callbackUrl = `${window.location.origin}/api/integrations/x/callback`;

  // Listen to OAuth popup messages
  useEffect(() => {
    const handleResult = async (data: any) => {
      if (!isConnecting) return;
      if (data?.type === 'X_AUTH_SUCCESS') {
        setIsConnecting(false);
        const userData = data.data;
        setConnectedXUser({
          username: userData.username,
          displayName: userData.displayName || userData.username,
          avatarUrl: userData.avatarUrl,
        });
        await refreshXStatus();
        // Immediately initiate initial bookmark import
        triggerInitialBookmarkImport();
      } else if (data?.type === 'X_AUTH_ERROR') {
        setIsConnecting(false);
        setConnectError(data.error || 'X authorization was rejected or cancelled.');
      }
    };
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin) void handleResult(event.data);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'kortex_x_oauth_result' || !event.newValue) return;
      try { void handleResult(JSON.parse(event.newValue)); } catch { /* Ignore malformed data. */ }
      localStorage.removeItem('kortex_x_oauth_result');
    };

    window.addEventListener('message', handleOAuthMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isConnecting, refreshXStatus]);

  const triggerInitialBookmarkImport = async () => {
    setIsImporting(true);
    setImportStage('fetching');
    setImportProgressMessage('Connecting to official X API v2 and reading bookmarks...');

    try {
      const result = await api.syncX();
      if (!result.success) throw new Error(result.error || 'X bookmark import could not complete.');

      setImportStage('complete');
      setImportProgressMessage('Bookmarks saved to library.');
      setImportedCount(result.addedCount);

      if (result.items && result.items.length > 0) {
        addImportedBookmarks(result.items);
      }
      await refreshXStatus();
    } catch (e: any) {
      console.error('Import error during onboarding:', e);
      setConnectError(e.message || 'Could not import bookmarks from X.');
      setImportStage('idle');
      setImportedCount(null);
    } finally {
      setIsImporting(false);
    }
  };

  const handleConnectX = async () => {
    setConnectError(null);
    setIsConnecting(true);

    try {
      const authData = await api.getXAuthUrl(user?.id);

      if (authData.configured && authData.url) {
        // Open official X OAuth PKCE popup
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
          setConnectError('Popup blocked by browser. Please allow popups for this site and try again.');
        }
      } else {
        // Not configured in environment variables: show configuration guide & test option
        setIsConnecting(false);
        setShowConfigHelper(true);
      }
    } catch (err: any) {
      setIsConnecting(false);
      setConnectError(err.message || 'Could not initiate connection to X.');
    }
  };

  const handleConnectTestStream = async () => {
    setIsConnecting(true);
    setShowConfigHelper(false);
    try {
      const testRes = await api.testConnectX('faruk', name || 'Faruk');
      if (testRes.success) {
        setConnectedXUser({
          username: testRes.account.username || 'faruk',
          displayName: testRes.account.displayName || name || 'Faruk',
          avatarUrl: testRes.account.avatarUrl,
        });
        await refreshXStatus();
        triggerInitialBookmarkImport();
      }
    } catch (e: any) {
      setConnectError('Could not connect test account.');
    } finally {
      setIsConnecting(false);
    }
  };

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  // Common timezones list for selection
  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Amsterdam',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'UTC',
  ];

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      await completeOnboarding(name, timezone);
      navigate('/dashboard');
    } catch (e) {
      console.warn('Complete onboarding error:', e);
      navigate('/dashboard');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-lg bg-[#FFFFFF] border border-[#E8E8E5] rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col items-center text-center">
        {/* Brand Icon */}
        <div className="w-11 h-11 rounded-2xl bg-[#171717] text-[#FAFAF8] flex items-center justify-center mb-6 shadow-xs">
          <Layers className="w-5 h-5" />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-[#171717]'
                  : s < step
                  ? 'w-4 bg-emerald-600'
                  : 'w-4 bg-[#E0E0DC]'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Welcome to Recallly */}
        {step === 1 && (
          <div className="space-y-6 w-full animate-in fade-in duration-200">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">
                Welcome to Recallly
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">
                Turn what you save into what you know.
              </h1>
              <p className="text-xs sm:text-sm text-[#70706B] max-w-md mx-auto leading-relaxed pt-1">
                Recallly organizes the things you save so you can find, revisit and learn from them later.
              </p>
            </div>

            <div className="pt-2">
              <button
                id="onboarding-step1-cta"
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Basic profile */}
        {step === 2 && (
          <div className="space-y-6 w-full animate-in fade-in duration-200 text-left">
            <div className="text-center space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">
                Step 2 of 3
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                Basic profile
              </h2>
              <p className="text-xs text-[#70706B]">
                Tell us how you would like to be addressed and your local timezone.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Faruk or Jordan"
                  className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A0A09B] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:bg-[#FFFFFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#70706B]" />
                  <span>Timezone</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAFAF8] border border-[#E0E0DC] rounded-xl text-xs sm:text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:bg-[#FFFFFF]"
                >
                  {!commonTimezones.includes(timezone) && (
                    <option value={timezone}>{timezone} (Detected)</option>
                  )}
                  {commonTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#8A8A85] mt-1">
                  Auto-detected from your browser. Used to deliver timely weekly digests.
                </p>
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[#E0E0DC] text-xs font-medium text-[#70706B] hover:text-[#171717] hover:bg-[#FAFAF8] transition-colors"
                >
                  Back
                </button>
                <button
                  id="onboarding-step2-cta"
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Connect your first source */}
        {step === 3 && (
          <div className="space-y-6 w-full animate-in fade-in duration-200">
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A85]">
                Step 3 of 3
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-[#171717]">
                Connect your first source
              </h2>
              <p className="text-xs text-[#70706B] max-w-sm mx-auto">
                Recallly connects with official read-only APIs to normalize and organize your bookmarks.
              </p>
            </div>

            {/* Error Banner */}
            {connectError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{connectError}</p>
                  {connectError.toLowerCase().includes('popup') && (
                    <p className="text-[11px] text-rose-700 mt-0.5">Allow popups for this site, then retry.</p>
                  )}
                </div>
              </div>
            )}

            {/* Connected State */}
            {connectedXUser ? (
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {connectedXUser.avatarUrl ? (
                      <img
                        src={connectedXUser.avatarUrl}
                        alt={connectedXUser.displayName}
                        className="w-10 h-10 rounded-xl object-cover border border-emerald-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-base shadow-xs">
                        𝕏
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#171717]">
                          {connectedXUser.displayName}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Connected</span>
                        </span>
                      </div>
                      <p className="text-xs text-[#70706B]">@{connectedXUser.username}</p>
                    </div>
                  </div>
                </div>

                {/* Import progress bar / feedback */}
                {isImporting ? (
                  <div className="p-3.5 rounded-xl bg-white border border-emerald-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#171717] flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>{importProgressMessage}</span>
                      </span>
                      <span className="text-[11px] text-[#8A8A85]">
                        {importStage === 'fetching' ? 'Stage 1/3' : importStage === 'organizing' ? 'Stage 2/3' : 'Stage 3/3'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E8E8E5] rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-emerald-600 transition-all duration-500 rounded-full ${
                          importStage === 'fetching' ? 'w-1/3' : importStage === 'organizing' ? 'w-2/3' : 'w-full'
                        }`}
                      />
                    </div>
                  </div>
                ) : connectError ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    X is connected, but bookmarks have not been imported. {connectError}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white border border-emerald-200/70 text-xs text-[#171717] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {importedCount !== null && importedCount > 0
                        ? `Imported ${importedCount} bookmarks into your library.`
                        : 'Bookmarks synchronized and ready in your library.'}
                    </span>
                  </div>
                )}

                <button
                  id="onboarding-enter-library-btn"
                  type="button"
                  disabled={isImporting || isFinishing}
                  onClick={handleFinishOnboarding}
                  className="w-full py-3 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isFinishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Entering library...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Recallly & View Bookmarks</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* X Source Connection Card */
              <div className="p-5 rounded-2xl border border-[#E8E8E5] bg-[#FAFAF8] text-left space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-base shadow-xs">
                    𝕏
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#171717]">X / Twitter</h3>
                      <span className="text-[10px] font-semibold text-[#8A8A85] bg-[#E8E8E5] px-1.5 py-0.5 rounded">
                        OAuth 2.0 PKCE
                      </span>
                    </div>
                    <p className="text-xs text-[#70706B] mt-0.5">
                      Read-only access (bookmark.read, tweet.read). We never post or write.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    id="onboarding-connect-x-btn"
                    type="button"
                    disabled={isConnecting}
                    onClick={handleConnectX}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#171717] hover:bg-[#2B2B2B] text-[#FAFAF8] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening X authorization...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect X Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Configuration & Developer Details Assistant */}
                {showConfigHelper && (
                  <div className="p-3.5 rounded-xl bg-white border border-[#E0E0DC] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#171717] flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600" />
                        <span>X Developer Setup Assistant</span>
                      </span>
                      <button
                        onClick={() => setShowConfigHelper(false)}
                        className="text-[11px] text-[#8A8A85] hover:text-[#171717]"
                      >
                        Dismiss
                      </button>
                    </div>

                    <p className="text-[11px] text-[#70706B] leading-relaxed">
                      To authenticate with your live X account, configure <code className="bg-[#F4F4F1] px-1 py-0.5 rounded font-mono text-[10px]">X_CLIENT_ID</code> in AI Studio settings. Use this exact Redirect URL in your X Developer Portal:
                    </p>

                    <div className="flex items-center gap-1.5 p-2 bg-[#F7F7F5] border border-[#E8E8E5] rounded-lg">
                      <code className="text-[11px] font-mono text-[#171717] truncate flex-1">
                        {callbackUrl}
                      </code>
                      <button
                        type="button"
                        onClick={copyCallbackUrl}
                        className="p-1 rounded text-[#70706B] hover:text-[#171717] hover:bg-white"
                        title="Copy callback URL"
                      >
                        {copiedCallback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleConnectTestStream}
                        className="w-full py-2 px-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Connect Test Stream to Verify Sync Flow</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Explore Demo Library Option */}
            <div className="pt-2 space-y-2">
              <button
                id="onboarding-explore-library-btn"
                type="button"
                disabled={isFinishing || isImporting}
                onClick={handleFinishOnboarding}
                className="w-full py-3 px-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F9F9F7] border border-[#E0E0DC] text-[#171717] font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isFinishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing library...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>{connectedXUser ? 'Continue to dashboard' : 'Explore demo library'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-[#70706B] hover:text-[#171717] transition-colors py-1 cursor-pointer"
              >
                Back to step 2
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
