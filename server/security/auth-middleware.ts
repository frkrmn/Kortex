import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../../src/lib/supabase/client';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  isDemoUser?: boolean;
}

/**
 * Server-side Authentication Middleware
 * Authoritatively identifies the caller from Supabase JWT (Authorization: Bearer <token>).
 * In Demo Mode, securely isolates unauthenticated requests to the demo sandbox identity.
 * Strictly prevents client query/body parameters from spoofing user identity (IDOR mitigation).
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 1. If valid Bearer token exists, verify with Supabase
  if (token && token !== 'demo_token') {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          req.userId = user.id;
          req.isDemoUser = false;
          return next();
        }
      } catch (err) {
        console.warn('[AuthMiddleware] Supabase token verification failed:', err);
      }
    }
  }

  // 2. Demo Mode Support
  const isDemoMode = process.env.VITE_DEMO_MODE === 'true' || !process.env.VITE_SUPABASE_URL;

  if (isDemoMode) {
    // In demo mode, assign isolated demo user identity
    req.userId = 'user_default';
    req.isDemoUser = true;
    return next();
  }

  // 3. In Live Production mode without valid token:
  // Allow public read routes (e.g. public collections) but do not assign a trusted userId
  req.userId = undefined;
  req.isDemoUser = false;
  next();
}

/**
 * Guard that enforces mandatory authentication.
 * Returns 401 Unauthorized if no valid user session is identified.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      error: 'Authentication required. Please provide a valid session token.',
      code: 'UNAUTHORIZED',
    });
  }
  next();
}
