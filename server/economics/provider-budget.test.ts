import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderBudgetService } from './provider-budget';

test('provider budget applies priority ceilings and the hard cap', async () => {
  const oldFetch = globalThis.fetch;
  const names = ['VITE_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','X_POST_READ_ESTIMATED_COST',
    'X_PRICING_VERSION','X_API_MONTHLY_BUDGET','X_API_USER_MONTHLY_BUDGET','X_API_WARNING_THRESHOLD_PERCENT','X_API_HARD_LIMIT_PERCENT',
    'X_API_FREE_MANUAL_STOP_PERCENT','X_API_AUTOMATIC_STOP_PERCENT','X_API_OPPORTUNISTIC_STOP_PERCENT'] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  Object.assign(process.env, { VITE_SUPABASE_URL: 'http://localhost:39999', SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    X_POST_READ_ESTIMATED_COST: '1', X_PRICING_VERSION: 'test', X_API_MONTHLY_BUDGET: '100',
    X_API_USER_MONTHLY_BUDGET: '100', X_API_WARNING_THRESHOLD_PERCENT: '80', X_API_HARD_LIMIT_PERCENT: '100',
    X_API_FREE_MANUAL_STOP_PERCENT: '80', X_API_AUTOMATIC_STOP_PERCENT: '90', X_API_OPPORTUNISTIC_STOP_PERCENT: '70' });
  let spend = 79;
  let reservations = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    if (url.pathname === '/rest/v1/provider_usage_events')
      return Response.json([{ estimated_cost: spend, resources_read: spend, imported_items: spend,
        requests_made: 1 }]);
    if (url.pathname === '/rest/v1/rpc/reserve_provider_budget') {
      reservations++;
      return Response.json('reservation-1');
    }
    throw new Error(`Unexpected ${init?.method} ${url}`);
  };
  try {
    assert.equal((await ProviderBudgetService.canPerformOperation('user-a', 1, 'automatic')).allowed, true);
    spend = 80;
    assert.equal((await ProviderBudgetService.canPerformOperation('user-a', 1, 'free_manual')).allowed, false);
    assert.equal((await ProviderBudgetService.canPerformOperation('user-a', 1, 'automatic')).allowed, true);
    assert.equal((await ProviderBudgetService.canPerformOperation('user-a', 1, 'paid_manual')).allowed, true);
    assert.equal(await ProviderBudgetService.reserve('user-a', 1, 'free_manual'), null);
    assert.equal(reservations, 0);
    spend = 100;
    assert.equal((await ProviderBudgetService.canPerformOperation('user-a', 1, 'paid_manual')).allowed, false);
  } finally {
    globalThis.fetch = oldFetch;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
});
