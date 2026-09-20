import { economicsAdmin } from './credit-service';

export type ImportEvent = 'import_credits_viewed'|'import_pack_selected'|'import_checkout_started'|
  'import_pack_purchased'|'import_started'|'import_completed'|'import_credit_limit_reached'|'sync_zero_yield';

export async function recordImportEvent(userId: string, eventName: ImportEvent, properties: Record<string, string|number|boolean> = {}) {
  const { error } = await economicsAdmin().from('import_analytics_events').insert({
    user_id: userId, event_name: eventName, properties,
  });
  if (error) console.warn('[ImportAnalytics] Event could not be recorded:', eventName, error.message);
}
