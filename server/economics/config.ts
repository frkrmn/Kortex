// Commercial values are deployment configuration, never client-supplied amounts.
const integer = (name: string) => {
  const raw = process.env[name];
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : 0;
};
const money = (name: string) => {
  const raw = process.env[name];
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};
const percent = (name: string, fallback: number) => Math.min(100, Math.max(1, integer(name) || fallback));

export const importConfig = () => ({
  signupCredits: integer('FREE_SIGNUP_IMPORT_CREDITS'),
  migrationCredits: integer('EXISTING_USER_IMPORT_CREDITS'),
  proMonthlyCredits: integer('PRO_MONTHLY_IMPORT_CREDITS'),
  trialCredits: integer('PRO_TRIAL_IMPORT_CREDITS'),
  packs: {
    import_500: { credits: integer('IMPORT_500_CREDITS'), priceId: process.env.STRIPE_IMPORT_500_PRICE_ID || '' },
    import_1000: { credits: integer('IMPORT_1000_CREDITS'), priceId: process.env.STRIPE_IMPORT_1000_PRICE_ID || '' },
    import_5000: { credits: integer('IMPORT_5000_CREDITS'), priceId: process.env.STRIPE_IMPORT_5000_PRICE_ID || '' },
  },
  x: {
    unitCost: money('X_POST_READ_ESTIMATED_COST'),
    pricingVersion: process.env.X_PRICING_VERSION || 'unconfigured',
    monthlyBudget: money('X_API_MONTHLY_BUDGET'),
    userMonthlyBudget: money('X_API_USER_MONTHLY_BUDGET'),
    warningPercent: percent('X_API_WARNING_THRESHOLD_PERCENT', 80),
    hardPercent: percent('X_API_HARD_LIMIT_PERCENT', 100),
    freeManualStopPercent: percent('X_API_FREE_MANUAL_STOP_PERCENT', 80),
    automaticStopPercent: percent('X_API_AUTOMATIC_STOP_PERCENT', 90),
    opportunisticStopPercent: percent('X_API_OPPORTUNISTIC_STOP_PERCENT', 70),
    initialPageSize: integer('X_SYNC_INITIAL_PAGE_SIZE') || 20,
    incrementalPageSize: integer('X_SYNC_INCREMENTAL_PAGE_SIZE') || 10,
    maxPages: Math.min(100, integer('X_SYNC_MAX_PAGES_PER_RUN') || 3),
    maxHistoricalItems: Math.min(10000, integer('X_IMPORT_MAX_ITEMS') || 1000),
  },
});

export type ImportPackKey = keyof ReturnType<typeof importConfig>['packs'];
export const isImportPackKey = (value: unknown): value is ImportPackKey =>
  value === 'import_500' || value === 'import_1000' || value === 'import_5000';
