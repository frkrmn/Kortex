import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api } from '../lib/api';
import { BillingInterval, PLANS } from '../config/plans';
import { useAuth } from '../lib/auth/auth-context';

interface UpgradeModalProps { isOpen: boolean; onClose: () => void; reason?: string | null; onSuccess?: () => void }

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, reason }) => {
  const { profile } = useAuth();
  const [interval, setInterval] = useState<BillingInterval>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.createCheckoutSession({ plan: 'pro', interval, userEmail: profile?.email });
      if (response.isMock || !response.url) throw new Error('Stripe Checkout is not available for this account.');
      window.location.assign(response.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start Stripe Checkout.');
      setIsLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title" aria-describedby="upgrade-modal-description" className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#E5E5E0] bg-white text-[#171717] shadow-xl">
      <button ref={closeRef} type="button" onClick={onClose} className="absolute right-4 top-4 z-10 min-h-10 min-w-10 rounded-xl p-2 text-[#70706B] hover:bg-[#F4F4F1] hover:text-[#171717]" aria-label="Close upgrade dialog"><X className="h-5 w-5" /></button>
      <div className="border-b border-[#F0F0EB] bg-gradient-to-b from-[#F8FAFC] to-white p-6 sm:p-8">
        {reason && <p className="mb-3 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{reason}</p>}
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Sparkles className="h-5 w-5" /></div><div><h2 id="upgrade-modal-title" className="text-xl font-bold">Review Find Again Pro</h2><p id="upgrade-modal-description" className="mt-0.5 text-xs text-[#70706B]">Choose an interval, then review the authoritative price and terms in Stripe Checkout.</p></div></div>
        <fieldset className="mt-6"><legend className="sr-only">Billing interval</legend><div className="inline-flex rounded-xl border border-[#E5E5E0] bg-[#F0F0EC] p-1">{(['monthly', 'yearly'] as const).map(value => <button key={value} type="button" aria-pressed={interval === value} onClick={() => setInterval(value)} className={`min-h-10 rounded-lg px-4 py-2 text-xs font-semibold capitalize ${interval === value ? 'bg-white text-[#171717] shadow-xs' : 'text-[#70706B]'}`}>{value}</button>)}</div></fieldset>
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
        <ul className="space-y-2 text-xs leading-relaxed text-[#5C5C58]"><li>• Your existing Find Again library remains available.</li><li>• Manual X bookmark sync remains available.</li><li>• Stripe Checkout shows the current Pro price and payment terms before confirmation.</li></ul>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"><p className="text-lg font-bold">{PLANS.pro.prices[interval].formatted || 'See checkout'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-blue-800"><ShieldCheck className="h-3.5 w-3.5" />Secure checkout powered by Stripe.</p></div>
        <button type="button" onClick={handleCheckout} disabled={isLoading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 py-2.5 text-xs font-bold text-white disabled:opacity-50">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Opening Stripe…</> : <>Continue to Stripe Checkout<ArrowRight className="h-4 w-4" /></>}</button>
      </div>
    </div>
  </div>;
};
