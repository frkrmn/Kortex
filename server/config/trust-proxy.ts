import type { Express } from 'express';

/** Trust only Vercel's immediate proxy hop. Never use `true`, which would let
 * callers spoof the left-most X-Forwarded-For address. */
export function configureDeploymentTrustProxy(app: Express, vercel = process.env.VERCEL): void {
  if (vercel === '1') app.set('trust proxy', 1);
}
