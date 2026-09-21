/**
 * Recallly Upgrade Modal
 * Presentation and checkout launcher for Free -> Pro tier transition.
 * Supports Monthly and Yearly billing intervals,
 * and seamless fallback for demo / sandbox environments.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  Zap,
  Lock,
  Layers,
  Search,
  MessageSquare,
  Clock,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import { PLANS, PlanId, BillingInterval } from '../config/plans';
import { useDemoStore } from '../lib/store/demo-store';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string | null;
  onSuccess?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  reason,
  onSuccess,
}) => {
  const [interval, setInterval] = useState<BillingInterval>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast, profile } = useDemoStore();

  if (!isOpen) return null;

  const proPlan = PLANS.pro;
  const price = proPlan.prices[interval];
  const hasDisplayPrice = price.amount > 0;

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.createCheckoutSession({
        plan: 'pro',
        interval,
        userEmail: profile?.email,
      });

      if (response.isMock) {
        showToast('🎉 Upgraded to Recallly Pro! (Sandbox Mode)');
        setIsLoading(false);
        onClose();
        if (onSuccess) onSuccess();
        window.location.reload();
      } else if (response.url) {
        // Redirect to authoritative Stripe Checkout URL
        window.location.href = response.url;
      }
    } catch (err: any) {
      console.error('Checkout initiation failed:', err);
      setError(err.message || 'Unable to start checkout session. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div
      id="upgrade-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="upgrade-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E5E5E0] rounded-2xl shadow-xl overflow-hidden text-[#171717]"
      >
        {/* Close Button */}
        <button
          id="upgrade-modal-close-button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[#70706B] hover:text-[#171717] hover:bg-[#F4F4F1] transition-colors cursor-pointer z-10"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-[#F8FAFC] to-[#FFFFFF] border-b border-[#F0F0EB]">
          {reason && (
            <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>{reason}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upgrade-modal-title" className="text-xl font-bold tracking-tight text-[#171717]">
                Keep your knowledge library working for you
              </h2>
              <p className="text-xs text-[#70706B] mt-0.5">
                Upgrade to Pro for automatic sync and Recallly's complete intelligence experience.
              </p>
            </div>
          </div>

          {/* Billing Interval Toggle */}
          <div className="mt-6 flex items-center justify-center">
            <div className="inline-flex p-1 bg-[#F0F0EC] rounded-xl border border-[#E5E5E0]">
              <button
                type="button"
                id="toggle-interval-monthly"
                onClick={() => setInterval('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  interval === 'monthly'
                    ? 'bg-[#FFFFFF] text-[#171717] shadow-xs'
                    : 'text-[#70706B] hover:text-[#171717]'
                }`}
              >
                {PLANS.pro.prices.monthly.amount > 0 ? `Monthly (${PLANS.pro.prices.monthly.formatted}/mo)` : 'Monthly'}
              </button>
              <button
                type="button"
                id="toggle-interval-yearly"
                onClick={() => setInterval('yearly')}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  interval === 'yearly'
                    ? 'bg-[#FFFFFF] text-[#171717] shadow-xs'
                    : 'text-[#70706B] hover:text-[#171717]'
                }`}
              >
                <span>{PLANS.pro.prices.yearly.amount > 0 ? `Yearly (${PLANS.pro.prices.yearly.formatted}/yr)` : 'Yearly'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Comparison / Value Prop */}
        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
                <Layers className="w-4 h-4 text-[#2563EB]" />
                <span>Automatic X Bookmark Sync</span>
              </div>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                Keep adding new X bookmarks after your initial import without running manual syncs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
                <Search className="w-4 h-4 text-[#2563EB]" />
                <span>Semantic Search</span>
              </div>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                Find bookmarks by meaning even when you cannot remember the exact words.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
                <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                <span>Ask Recallly</span>
              </div>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                Ask questions across your library and receive grounded answers with citations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E8E8E5] bg-[#FAFAF8] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <span>Insights, Rediscovery & Digests</span>
              </div>
              <p className="text-[11px] text-[#70706B] leading-relaxed">
                Resurface useful ideas and receive weekly synthesis across your saved knowledge.
              </p>
            </div>
          </div>

          {/* Pricing Summary & Trial Banner */}
          <div className="p-4 rounded-xl bg-[#EEF4FF]/50 border border-[#DBEAFE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-[#171717]">
                  {hasDisplayPrice ? price.formatted : 'Current price in checkout'}
                </span>
                {hasDisplayPrice && <span className="text-xs text-[#70706B]">{interval === 'yearly' ? '/ year' : '/ month'}</span>}
                {interval === 'yearly' && <span className="text-[11px] text-[#70706B]">Billed annually</span>}
              </div>
              <p className="text-xs text-[#2563EB] font-medium mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>See Checkout for the current price and any available trial.</span>
              </p>
            </div>

            <button
              id="upgrade-modal-checkout-button"
              type="button"
              disabled={isLoading}
              onClick={handleCheckout}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#171717] text-[#FFFFFF] text-xs font-bold hover:bg-[#333333] transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Stripe...</span>
                </>
              ) : (
                <>
                  <span>Upgrade to Pro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-[#8A8A85]">
            Secure checkout powered by Stripe. Review all payment terms before confirming.
          </p>
        </div>
      </div>
    </div>
  );
};
