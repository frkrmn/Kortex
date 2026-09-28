export type LiveSubscription = {
  plan?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  cancel_at_period_end?: boolean | null;
};

/** Server-authoritative Pro access used by scheduled provider work. */
export function hasActiveProEntitlement(subscription: LiveSubscription | null | undefined, now = new Date()) {
  if (subscription?.plan !== 'pro') return false;
  const status = subscription.status || '';
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : Number.NaN;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end).getTime() : periodEnd;
  const withinPeriod = Number.isFinite(periodEnd) && periodEnd > now.getTime();
  const withinTrial = Number.isFinite(trialEnd) && trialEnd > now.getTime();
  if (status === 'active' || status === 'past_due') return withinPeriod;
  if (status === 'trialing') return withinTrial;
  return Boolean(subscription.cancel_at_period_end && withinPeriod && status === 'canceled');
}
