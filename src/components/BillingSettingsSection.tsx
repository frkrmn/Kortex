/**
 * Recallly Billing & Plans Settings Component
 * Displays authoritative subscription status, in-app entitlement meters,
 * Stripe Checkout / Customer Portal triggers, and a sandbox simulator.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CreditCard,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Layers,
  Search,
  MessageSquare,
  Zap,
  RotateCcw,
  Check,
  Loader2,
  Calendar,
} from 'lucide-react';
import { api } from '../lib/api';
import { Subscription, EntitlementData } from '../types';
import { useDemoStore } from '../lib/store/demo-store';
import { UpgradeModal } from './UpgradeModal';

export const BillingSettingsSection: React.FC = () => {
  const { showToast, profile, updateProfile } = useDemoStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof api.getImportCredits>> | null>(null);
  const [packs, setPacks] = useState<Array<{ key: string; credits: number }>>([]);
  const [proMonthlyImports, setProMonthlyImports] = useState(0);

  // Check URL parameters for checkout results
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      const [subData, entData] = await Promise.all([
        api.getSubscription(),
        api.getEntitlements(),
      ]);
      setSubscription(subData);
      setEntitlements(entData);
      if ((import.meta as any).env.VITE_DEMO_MODE === 'false') {
        const [creditData, packData] = await Promise.all([api.getImportCredits(), api.getImportPacks()]);
        setWallet(creditData); setPacks(packData.packs); setProMonthlyImports(packData.proMonthlyImports);
      }

      if (profile && profile.plan !== subData.plan) {
        updateProfile({ plan: subData.plan === 'pro' ? 'pro' : 'starter' });
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();

    // Check query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutNotice('Checkout completed. Your balance updates after payment confirmation.');
    } else if (params.get('checkout') === 'cancel') {
      setCheckoutNotice('Checkout was cancelled. Your current plan was not changed.');
    } else if (params.get('portal') === 'simulated') {
      setCheckoutNotice('Stripe Customer Portal requested. In demo mode, use the simulation switcher below.');
    }
  }, []);

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const portal = await api.createPortalSession();
      if (portal.url) {
        window.location.href = portal.url;
      }
    } catch (err: any) {
      console.error('Failed to open billing portal:', err);
      showToast(err.message || 'Unable to open billing portal.');
      setIsOpeningPortal(false);
    }
  };

  const handleSimulate = async (
    plan: 'free' | 'pro',
    status: string = 'active',
    interval: 'monthly' | 'yearly' = 'monthly'
  ) => {
    setIsSimulating(true);
    try {
      const res = await api.simulateSubscription({ plan, status, interval });
      setSubscription(res.subscription);
      setEntitlements(res.entitlements);
      updateProfile({ plan: res.subscription.plan === 'pro' ? 'pro' : 'starter' });
      showToast(`Switched plan to ${plan.toUpperCase()} (${status}).`);
    } catch (err) {
      console.error('Simulation error:', err);
      showToast('Failed to switch simulation state.');
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[#70706B] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
        <p className="text-xs">Loading subscription and entitlements...</p>
      </div>
    );
  }

  const isPro = subscription?.plan === 'pro';
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceled = subscription?.status === 'canceled' || subscription?.cancel_at_period_end;

  const bookmarksLimit = entitlements?.limits?.bookmarks ?? (entitlements?.limits as any)?.maxBookmarks ?? (isPro ? null : 250);
  const isBookmarksUnlimited = bookmarksLimit === null || bookmarksLimit === -1;
  const bookmarksCount = entitlements?.usage?.bookmarksCount ?? 0;

  const enrichmentLimit = entitlements?.limits?.monthlyEnrichment ?? (entitlements?.limits as any)?.monthlyEnrichmentQuota ?? (isPro ? 300 : 25);
  const isEnrichmentUnlimited = enrichmentLimit === null || enrichmentLimit === -1;
  const enrichmentCount = entitlements?.usage?.monthlyEnrichmentCount ?? (entitlements?.usage as any)?.monthlyEnrichmentUsed ?? 0;

  const askLimit = entitlements?.limits?.monthlyAsk ?? (entitlements?.limits as any)?.monthlyAskQuota ?? (isPro ? 150 : 10);
  const isAskUnlimited = askLimit === null || askLimit === -1;
  const askCount = entitlements?.usage?.monthlyAskCount ?? (entitlements?.usage as any)?.monthlyAskUsed ?? 0;

  return (
    <div className="space-y-6" id="billing-settings-container">
      {(import.meta as any).env.VITE_DEMO_MODE === 'false' && (
        <section className="rounded-2xl border border-[#E0E0DC] bg-white p-5 space-y-4">
          <h3 className="text-lg font-bold">Import Credits</h3>
          <p className="text-sm">{wallet ? `${wallet.availableCredits.toLocaleString()} imports remaining` : 'Credit balance unavailable'}</p>
          {wallet && <p className="text-xs text-[#70706B]">Monthly remaining: {wallet.monthlyCredits.toLocaleString()} · Other included: {(wallet.includedCredits - wallet.monthlyCredits).toLocaleString()} · Purchased: {wallet.purchasedCredits.toLocaleString()}</p>}
          {isPro && <p className="text-xs text-[#70706B]">Monthly Pro allowance: {proMonthlyImports.toLocaleString()} imports. Next allowance if Pro remains active: {wallet?.nextMonthlyAllowanceAt ? new Date(wallet.nextMonthlyAllowanceAt).toLocaleDateString() : 'unavailable'}.</p>}
          <p className="text-xs text-[#70706B]">Credits are used only when new items are added. Previously imported items do not consume credits again. Purchased credits do not expire.</p>
          <div className="flex flex-wrap gap-2">
            {packs.map(pack => <button key={pack.key} type="button" onClick={async () => {
              try { const checkout = await api.buyImportPack(pack.key); window.location.href = checkout.url; }
              catch (error: any) { showToast(error.message || 'Checkout unavailable.'); }
            }} className="rounded-xl border border-[#E0E0DC] px-4 py-2 text-xs font-semibold hover:bg-[#FAFAF8]">
              Add {pack.credits.toLocaleString()} imports
            </button>)}
          </div>
          {wallet?.transactions?.length ? <div className="space-y-1 text-xs text-[#70706B]">
            {wallet.transactions.slice(0, 5).map((entry, index) => <p key={index}>
              {new Date(entry.created_at).toLocaleDateString()} · {entry.type.replaceAll('_', ' ')} · {entry.balance_delta > 0 ? '+' : ''}{entry.balance_delta}
            </p>)}
          </div> : null}
        </section>
      )}
      {/* Checkout Return Notice */}
      {checkoutNotice && (
        <div
          id="checkout-notice-banner"
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border ${
            checkoutNotice.includes('🎉')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{checkoutNotice}</span>
          </div>
          <button
            onClick={() => setCheckoutNotice(null)}
            className="text-[11px] font-semibold underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Trialing Alert Banner */}
      {isTrialing && (
        <div
          id="trial-status-banner"
          className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <p className="font-bold">
                You are currently in a Recallly Pro trial.
              </p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                {subscription?.trial_days_left !== undefined
                  ? `${subscription.trial_days_left} days remaining in trial.`
                  : 'Trial ends soon.'}{' '}
                Check your billing portal for the trial end date and payment terms.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPortal}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
          >
            Manage Payment
          </button>
        </div>
      )}

      {/* Past Due Alert Banner */}
      {isPastDue && (
        <div
          id="past-due-banner"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Payment Issue: Subscription Past Due</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Your last invoice payment did not succeed. Please update your payment method to maintain full Pro access.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenPortal}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
          >
            Update Card
          </button>
        </div>
      )}

      {/* Cancellation Notice Banner */}
      {isCanceled && (
        <div
          id="cancellation-notice-banner"
          className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Subscription Pending Cancellation</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Your Pro subscription is set to cancel at the end of the billing period (
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : 'period end'}
                ). All existing bookmarks and embeddings will remain completely intact.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#171717] text-white font-semibold text-xs hover:bg-[#333333] transition-colors cursor-pointer shrink-0"
          >
            Renew Pro
          </button>
        </div>
      )}

      {/* 1. Plan Overview Card */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[#171717]">Current Plan</h2>
              <span
                id="current-plan-badge"
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isPro
                    ? 'bg-[#EEF4FF] text-[#2563EB] border border-[#DBEAFE]'
                    : 'bg-[#F4F4F1] text-[#70706B] border border-[#E5E5E0]'
                }`}
              >
                {subscription?.plan?.toUpperCase()}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  subscription?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800'
                    : subscription?.status === 'trialing'
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {subscription?.status}
              </span>
            </div>
            <p className="text-xs text-[#70706B] mt-1">
              {isPro
                ? `Recallly Pro (${subscription?.interval || 'monthly'}) — $${
                    subscription?.interval === 'yearly' ? '99/year' : '12/month'
                  }`
                : 'Free Tier — 250 bookmarks, basic lexical search, and 10 Ask Recallly questions per month.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isPro ? (
              <button
                id="manage-billing-portal-button"
                type="button"
                disabled={isOpeningPortal}
                onClick={handleOpenPortal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#FAFAF8] border border-[#E2E2DC] text-[#171717] hover:bg-[#F2F2EE] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isOpeningPortal ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-[#70706B]" />
                )}
                <span>Manage in Customer Portal</span>
                <ExternalLink className="w-3 h-3 text-[#8A8A85]" />
              </button>
            ) : (
              <button
                id="upgrade-to-pro-header-button"
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#171717] text-[#FFFFFF] hover:bg-[#333333] transition-colors cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Upgrade to Pro</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Renewal / Expiry Details */}
        {subscription?.current_period_end && (
          <div className="pt-4 border-t border-[#F0F0EC] flex flex-wrap items-center gap-6 text-xs text-[#70706B]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#8A8A85]" />
              <span>
                {isCanceled ? 'Access ends:' : 'Renews on:'}{' '}
                <strong className="text-[#171717]">
                  {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </strong>
              </span>
            </div>

            {subscription.customer_id && (
              <div className="text-[11px] text-[#8A8A85]">
                Stripe Customer: <code className="font-mono">{subscription.customer_id}</code>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Authoritative In-App Usage Meters */}
      <div className="p-6 bg-[#FFFFFF] border border-[#E8E8E5] rounded-2xl shadow-2xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-[#171717]">Usage & Quota Entitlements</h2>
          <p className="text-xs text-[#70706B] mt-0.5">
            Real-time usage tracked by the authoritative Recallly Entitlement Engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Meter 1: Bookmarks Count */}
          <div
            id="meter-bookmarks-card"
            className="p-4 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#171717]">
                <Layers className="w-4 h-4 text-[#2563EB]" />
                <span>Saved Bookmarks</span>
              </div>
              <span className="text-[11px] font-semibold text-[#70706B]">
                {isBookmarksUnlimited ? (
                  <span className="text-emerald-800 font-bold">Unlimited</span>
                ) : (
                  `${bookmarksCount} / ${bookmarksLimit}`
                )}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#E5E5E0] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isBookmarksUnlimited
                    ? 'bg-emerald-500 w-1/4'
                    : bookmarksCount >= (bookmarksLimit || 250)
                    ? 'bg-rose-500 w-full'
                    : 'bg-[#2563EB]'
                }`}
                style={{
                  width: isBookmarksUnlimited
                    ? '35%'
                    : `${Math.min(100, Math.round((bookmarksCount / (bookmarksLimit || 250)) * 100))}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-[#8A8A85]">
              {isBookmarksUnlimited
                ? 'Unlimited capacity for your whole digital archive.'
                : `${Math.max(0, (bookmarksLimit || 250) - bookmarksCount)} saves left on Free plan.`}
            </p>
          </div>

          {/* Meter 2: Monthly AI Enrichment */}
          <div
            id="meter-enrichment-card"
            className="p-4 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#171717]">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <span>AI Enrichments</span>
              </div>
              <span className="text-[11px] font-semibold text-[#70706B]">
                {isEnrichmentUnlimited ? (
                  <span className="text-emerald-800 font-bold">Unlimited</span>
                ) : (
                  `${enrichmentCount} / ${enrichmentLimit}`
                )}
              </span>
            </div>

            <div className="w-full bg-[#E5E5E0] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isEnrichmentUnlimited
                    ? 'bg-emerald-500 w-1/4'
                    : enrichmentCount >= (enrichmentLimit || 25)
                    ? 'bg-amber-500'
                    : 'bg-[#2563EB]'
                }`}
                style={{
                  width: isEnrichmentUnlimited
                    ? '35%'
                    : `${Math.min(100, Math.round((enrichmentCount / (enrichmentLimit || 25)) * 100))}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-[#8A8A85]">
              {isPro ? `${enrichmentLimit || 300} enrichments / mo on Pro.` : '25 initial enrichments on Free.'}
            </p>
          </div>

          {/* Meter 3: Monthly Ask Recallly */}
          <div
            id="meter-ask-card"
            className="p-4 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[#171717]">
                <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                <span>Ask Recallly Queries</span>
              </div>
              <span className="text-[11px] font-semibold text-[#70706B]">
                {isAskUnlimited ? (
                  <span className="text-emerald-800 font-bold">Unlimited</span>
                ) : (
                  `${askCount} / ${askLimit}`
                )}
              </span>
            </div>

            <div className="w-full bg-[#E5E5E0] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isAskUnlimited
                    ? 'bg-emerald-500 w-1/4'
                    : askCount >= (askLimit || 10)
                    ? 'bg-rose-500'
                    : 'bg-[#2563EB]'
                }`}
                style={{
                  width: isAskUnlimited
                    ? '35%'
                    : `${Math.min(100, Math.round((askCount / (askLimit || 10)) * 100))}%`,
                }}
              />
            </div>

            <p className="text-[11px] text-[#8A8A85]">
              {isPro ? `${askLimit || 150} grounded RAG queries / mo on Pro.` : '10 questions / mo on Free.'}
            </p>
          </div>
        </div>

        {/* Feature Matrix / Capability Badges */}
        <div className="pt-4 border-t border-[#F0F0EC] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#70706B]" />
              <span className="font-medium text-[#171717]">Hybrid Vector Search</span>
            </div>
            {entitlements?.features.semanticSearch ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                <Check className="w-3 h-3 text-emerald-600" /> Active (768-dim)
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#70706B] bg-[#E8E8E5] px-2 py-0.5 rounded">
                Lexical Only (Pro required)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#70706B]" />
              <span className="font-medium text-[#171717]">Weekly AI Digests</span>
            </div>
            {entitlements?.features.digests ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                <Check className="w-3 h-3 text-emerald-600" /> Unlocked
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#70706B] bg-[#E8E8E5] px-2 py-0.5 rounded">
                Locked on Free
              </span>
            )}
          </div>
        </div>
      </div>

      {(import.meta as any).env.VITE_DEMO_MODE !== 'false' && <>
      {/* 3. Developer / Sandbox Simulation Switcher */}
      <div className="p-6 bg-[#FAFAF8] border border-[#E0E0DC] rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#70706B]" />
              <h3 className="text-xs font-bold text-[#171717]">Sandbox / Development Switcher</h3>
            </div>
            <p className="text-[11px] text-[#70706B] mt-0.5">
              Simulate subscription lifecycles to inspect entitlement responses and UI reactions.
            </p>
          </div>
          {isSimulating && <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            disabled={isSimulating}
            onClick={() => handleSimulate('free', 'active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              !isPro && subscription?.status === 'active'
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'bg-white text-[#171717] border-[#D1D1CB] hover:bg-[#F2F2EE]'
            }`}
          >
            Switch to Free
          </button>

          <button
            type="button"
            disabled={isSimulating}
            onClick={() => handleSimulate('pro', 'active', 'monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isPro && subscription?.status === 'active'
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'bg-white text-[#171717] border-[#D1D1CB] hover:bg-[#F2F2EE]'
            }`}
          >
            Switch to Pro (Active)
          </button>

          <button
            type="button"
            disabled={isSimulating}
            onClick={() => handleSimulate('pro', 'trialing', 'yearly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isTrialing
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-[#171717] border-[#D1D1CB] hover:bg-[#F2F2EE]'
            }`}
          >
            Switch to Pro (14-Day Trial)
          </button>

          <button
            type="button"
            disabled={isSimulating}
            onClick={() => handleSimulate('pro', 'past_due', 'monthly')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isPastDue
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-[#171717] border-[#D1D1CB] hover:bg-[#F2F2EE]'
            }`}
          >
            Simulate Past Due
          </button>
        </div>
      </div>
      </>}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={loadBillingData}
      />
    </div>
  );
};
