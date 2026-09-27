import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CreditCard, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { Subscription } from '../types';
import { api } from '../lib/api';
import { DEFAULT_TRIAL_DAYS } from '../config/plans';
import { UpgradeModal } from './UpgradeModal';
import { useAuth } from '../lib/auth/auth-context';

function dateLabel(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export const BillingSettingsSection: React.FC = () => {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const loadVersion = useRef(0);

  const load = async () => {
    const version = ++loadVersion.current;
    setState('loading');
    try {
      const next = await api.getSubscription();
      if (version !== loadVersion.current) return;
      setSubscription(next);
      setState('ready');
    } catch {
      if (version === loadVersion.current) setState('error');
    }
  };

  useEffect(() => {
    setSubscription(null);
    void load();
    return () => { loadVersion.current += 1; };
  }, [profile?.user_id]);

  const openPortal = async () => {
    setPortalLoading(true);
    setActionError(null);
    try {
      const result = await api.createPortalSession();
      if (result.isMock || !result.url) throw new Error('Billing management is not available for this account.');
      window.location.assign(result.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Billing management could not be opened.');
      setPortalLoading(false);
    }
  };

  if (state === 'loading') return <div role="status" className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border border-[#E8E8E5] bg-white text-xs text-[#70706B]"><Loader2 className="h-4 w-4 animate-spin" />Loading billing status…</div>;
  if (state === 'error' || !subscription) return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-900"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>Your subscription status could not be loaded. No billing action was taken.</span></div><button type="button" onClick={() => void load()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>;

  const isPro = (subscription.plan === 'pro' || subscription.plan === 'free_trial') && ['active', 'trialing', 'past_due'].includes(subscription.status);
  const canManageBilling = isPro || Boolean(subscription.has_billing_account);
  const periodEnd = dateLabel(subscription.current_period_end);
  const trialEnd = dateLabel(subscription.trial_end);
  const statusLabel = subscription.status.replaceAll('_', ' ');

  return <>
    <div className="space-y-5 rounded-2xl border border-[#E8E8E5] bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><p className="text-xs font-medium text-[#70706B]">Current plan</p><div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold text-[#171717]">{isPro ? 'Recallly Pro' : 'Recallly Free'}</h2><span className="rounded-md bg-[#F0F0EC] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#5C5C58]">{statusLabel}</span></div></div>
        {canManageBilling ? <button type="button" onClick={openPortal} disabled={portalLoading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#D0D0CB] bg-white px-4 py-2 text-xs font-semibold text-[#171717] disabled:opacity-50">{portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}Manage billing</button> : <button type="button" onClick={() => setShowUpgrade(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171717] px-4 py-2 text-xs font-semibold text-white">Review Pro in checkout<ExternalLink className="h-3.5 w-3.5" /></button>}
      </div>

      {subscription.status === 'trialing' && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"><strong>Trial active.</strong> Recallly's configured trial term is {DEFAULT_TRIAL_DAYS} days.{trialEnd ? ` Your current trial ends ${trialEnd}.` : ''}</div>}
      {subscription.cancel_at_period_end && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Your subscription is set to end{periodEnd ? ` on ${periodEnd}` : ' at the end of the current billing period'}. Manage it in the Stripe billing portal.</div>}
      {subscription.status === 'past_due' && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">Stripe reports that payment is past due. Open billing management to review the account.</div>}
      {actionError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{actionError}</p>}

      <div className="grid grid-cols-1 gap-4 border-t border-[#F0F0EC] pt-5 sm:grid-cols-2">
        <div className="rounded-xl bg-[#FAFAF8] p-4"><p className="text-xs font-semibold text-[#171717]">Pricing and payment</p><p className="mt-1 text-xs leading-relaxed text-[#70706B]">See Stripe Checkout for the current price, billing interval, and payment terms. Recallly does not duplicate unverified price amounts here.</p></div>
        <div className="rounded-xl bg-[#FAFAF8] p-4"><p className="text-xs font-semibold text-[#171717]">Usage</p><p className="mt-1 text-xs leading-relaxed text-[#70706B]">X imports and manual sync do not consume customer credits. Recallly does not currently present a customer usage quota dashboard.</p></div>
      </div>
    </div>
    <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} onSuccess={() => void load()} />
  </>;
};
