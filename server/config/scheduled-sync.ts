/** Scheduled X work is opt-in. The legacy switch remains a kill switch. */
export function isXAutoSyncEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.X_AUTO_SYNC_ENABLED === 'true' && env.X_SYNC_ENABLED !== 'false';
}

export type XAutoSyncRolloutMode = 'off' | 'controlled' | 'production';

const positiveInteger = (value: string | undefined, fallback: number, max: number) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

const canonicalUserId = (value: string | undefined) => {
  const candidate = value?.trim().toLowerCase() || '';
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(candidate)
    ? candidate : null;
};

/** Scheduled X sync needs both a kill-switch opt-in and an explicit rollout. */
export function xAutoSyncControls(env: NodeJS.ProcessEnv = process.env) {
  const requestedMode = env.X_AUTO_SYNC_ROLLOUT_MODE?.trim().toLowerCase();
  const mode: XAutoSyncRolloutMode = requestedMode === 'controlled' || requestedMode === 'production'
    ? requestedMode : 'off';
  const controlledOwnerId = canonicalUserId(env.X_AUTO_SYNC_CONTROLLED_OWNER_USER_ID);
  const enabled = isXAutoSyncEnabled(env) && mode !== 'off' && (mode !== 'controlled' || Boolean(controlledOwnerId));
  return {
    enabled,
    mode,
    controlledOwnerId,
    batchSize: positiveInteger(env.X_SMART_SYNC_DAILY_BATCH_SIZE, 3, 20),
    maxPagesPerSync: positiveInteger(env.X_AUTO_SYNC_MAX_PAGES_PER_RUN, 1, 3),
  };
}

export function isXAutoSyncRolloutEligible(userId: string, env: NodeJS.ProcessEnv = process.env) {
  const controls = xAutoSyncControls(env);
  if (!controls.enabled) return false;
  return controls.mode === 'production' || controls.controlledOwnerId === userId.toLowerCase();
}
