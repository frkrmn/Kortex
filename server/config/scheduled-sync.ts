/** Scheduled X work is opt-in. The legacy switch remains a kill switch. */
export function isXAutoSyncEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.X_AUTO_SYNC_ENABLED === 'true' && env.X_SYNC_ENABLED !== 'false';
}
