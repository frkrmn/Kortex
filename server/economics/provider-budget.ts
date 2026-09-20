import { economicsAdmin } from './credit-service';
import { importConfig } from './config';

export class ProviderBudgetService {
  static priorityLimitPercent(priority: 'paid_manual'|'free_manual'|'automatic'|'opportunistic') {
    const config = importConfig().x;
    return priority === 'paid_manual' ? config.hardPercent : priority === 'automatic' ? config.automaticStopPercent
      : priority === 'free_manual' ? config.freeManualStopPercent : config.opportunisticStopPercent;
  }
  static async getMonthlySpend(provider: 'x', userId?: string) {
    const db = economicsAdmin();
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
    const total = { spend: 0, resourcesRead: 0, importedItems: 0, requestsMade: 0 };
    for (let offset = 0;; offset += 1000) {
      let query = db.from('provider_usage_events').select('estimated_cost,resources_read,imported_items,requests_made')
        .eq('provider', provider).gte('occurred_at', monthStart.toISOString()).order('occurred_at').range(offset, offset + 999);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      for (const row of data || []) {
        total.spend += Number(row.estimated_cost);
        total.resourcesRead += row.resources_read;
        total.importedItems += row.imported_items;
        total.requestsMade += row.requests_made;
      }
      if (!data || data.length < 1000) break;
    }
    return total;
  }

  static estimateOperationCost(resources: number) {
    return resources * importConfig().x.unitCost;
  }

  static async reserve(userId: string, expectedResources: number, priority: 'paid_manual'|'free_manual'|'automatic'|'opportunistic') {
    const preflight = await this.canPerformOperation(userId, expectedResources, priority);
    if (!preflight.allowed) return null;
    const config = importConfig().x;
    const { data, error } = await economicsAdmin().rpc('reserve_provider_budget', {
      p_user_id: userId, p_provider: 'x', p_estimated_cost: this.estimateOperationCost(expectedResources),
      p_global_limit: config.monthlyBudget * Math.min(config.hardPercent, this.priorityLimitPercent(priority)) / 100,
      p_user_limit: config.userMonthlyBudget,
    });
    if (error) throw error;
    return data as string | null;
  }

  static async canPerformOperation(userId: string, expectedResources: number, priority: 'paid_manual'|'free_manual'|'automatic'|'opportunistic') {
    const config = importConfig().x;
    if (!config.unitCost || !config.monthlyBudget || !config.userMonthlyBudget || config.pricingVersion === 'unconfigured')
      return { allowed: false, reason: 'X sync is temporarily unavailable. Your existing Recallly library is still available.' };
    const [global, user] = await Promise.all([this.getMonthlySpend('x'), this.getMonthlySpend('x', userId)]);
    const estimated = this.estimateOperationCost(expectedResources);
    const hard = config.monthlyBudget * Math.min(config.hardPercent, this.priorityLimitPercent(priority)) / 100;
    const globalAfter = global.spend + estimated;
    const userAfter = user.spend + estimated;
    // At warning level, retain budget for user-initiated work.
    const warning = global.spend >= config.monthlyBudget * config.warningPercent / 100;
    if (warning) console.warn('[ProviderBudget] X budget warning threshold reached.');
    return { allowed: globalAfter <= hard && userAfter <= config.userMonthlyBudget,
      reason: 'X sync is temporarily unavailable. Your existing Recallly library is still available.',
      global, user, estimated, warning };
  }

  static async recordUsage(params: { reservationId: string; syncJobId: string; resourcesRead: number; importedItems: number; requestId?: string; estimated?: boolean }) {
    const config = importConfig().x;
    const { error } = await economicsAdmin().rpc('settle_provider_budget', {
      p_reservation_id: params.reservationId, p_sync_job_id: params.syncJobId,
      p_resources: params.resourcesRead, p_imported: params.importedItems,
      p_unit_cost: config.unitCost, p_pricing_version: config.pricingVersion,
      p_request_id: params.requestId || null,
      p_count_estimated: Boolean(params.estimated),
    });
    if (error) throw error;
  }

  static async updateImportedItems(reservationId: string, importedItems: number, resourcesRead: number) {
    const { error } = await economicsAdmin().from('provider_usage_events').update({
      imported_items: importedItems, metadata: { zero_yield: resourcesRead > 0 && importedItems === 0 },
    }).eq('reservation_id', reservationId).select('id').single();
    if (error) throw error;
  }

  static async getBudgetState() {
    const config = importConfig().x;
    const usage = await this.getMonthlySpend('x');
    return { ...usage, monthlyBudget: config.monthlyBudget, warning: usage.spend >= config.monthlyBudget * config.warningPercent / 100,
      hardLimit: usage.spend >= config.monthlyBudget * config.hardPercent / 100,
      readsPerImport: usage.importedItems ? usage.resourcesRead / usage.importedItems : null };
  }

  static async getInternalMetrics() {
    const db = economicsAdmin();
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const month = new Date(today); month.setUTCDate(1);
    const rows: Array<{ user_id: string|null; sync_job_id: string|null; resources_read: number; imported_items: number; estimated_cost: number;
      occurred_at: string; metadata: Record<string, unknown> }> = [];
    for (let offset = 0;; offset += 1000) {
      const { data, error } = await db.from('provider_usage_events')
        .select('user_id,sync_job_id,resources_read,imported_items,estimated_cost,occurred_at,metadata')
        .eq('provider', 'x').gte('occurred_at', month.toISOString()).order('occurred_at').range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const total = rows.reduce((sum,row) => ({ resourcesRead: sum.resourcesRead+row.resources_read,
      importedItems: sum.importedItems+row.imported_items, estimatedSpend: sum.estimatedSpend+Number(row.estimated_cost),
    }),
      { resourcesRead: 0, importedItems: 0, estimatedSpend: 0 });
    const syncs = new Map<string, { resources: number; imported: number }>();
    for (const row of rows) {
      if (!row.sync_job_id || row.metadata?.count_estimated) continue;
      const entry = syncs.get(row.sync_job_id) || { resources: 0, imported: 0 };
      entry.resources += row.resources_read; entry.imported += row.imported_items;
      syncs.set(row.sync_job_id, entry);
    }
    const zeroYieldSyncs = Array.from(syncs.values()).filter(sync => sync.resources > 0 && sync.imported === 0).length;
    const { data: reservations, error: reservationError } = await db.from('provider_budget_reservations')
      .select('estimated_cost,created_at').eq('provider', 'x').is('completed_at', null).gte('created_at', month.toISOString());
    if (reservationError) throw reservationError;
    const users = new Set(rows.map(row => row.user_id).filter(Boolean));
    const perUser = new Map<string, { resourcesRead: number; importedItems: number; estimatedSpend: number }>();
    for (const row of rows) {
      if (!row.user_id) continue;
      const previous = perUser.get(row.user_id) || { resourcesRead: 0, importedItems: 0, estimatedSpend: 0 };
      previous.resourcesRead += row.resources_read;
      previous.importedItems += row.imported_items;
      previous.estimatedSpend += Number(row.estimated_cost);
      perUser.set(row.user_id, previous);
    }
    return { ...total, zeroYieldSyncs,
      unsettledReservations: reservations?.length || 0,
      unsettledEstimatedCost: (reservations || []).reduce((n,row) => n+Number(row.estimated_cost),0),
      resourcesReadToday: rows.filter(row => new Date(row.occurred_at) >= today).reduce((n,row) => n+row.resources_read,0),
      readsPerImportedItem: total.importedItems ? total.resourcesRead/total.importedItems : null,
      estimatedCostPerImportedItem: total.importedItems ? total.estimatedSpend/total.importedItems : null,
      estimatedCostPerActiveUser: users.size ? total.estimatedSpend/users.size : null,
      activeUsers: users.size,
      perUser: Array.from(perUser, ([userId, usage]) => ({ userId, ...usage,
        readsPerImportedItem: usage.importedItems ? usage.resourcesRead/usage.importedItems : null })),
    };
  }
}
