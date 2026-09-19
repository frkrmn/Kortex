import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface ClientRecord {
  timestamps: number[];
}

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please slow down and try again later.',
    keyGenerator = (req: Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || '127.0.0.1';
      const userId = (req as any).userId || 'anonymous';
      return `${ip}:${userId}`;
    },
  } = config;

  const storage = new Map<string, ClientRecord>();

  // Cleanup interval to prevent memory leaks every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of storage.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
      if (record.timestamps.length === 0) {
        storage.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyGenerator(req);

    let record = storage.get(key);
    if (!record) {
      record = { timestamps: [] };
      storage.set(key, record);
    }

    // Filter timestamps within current window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader('Retry-After', resetInSeconds);
      return res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: resetInSeconds,
      });
    }

    record.timestamps.push(now);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - record.timestamps.length);
    next();
  };
}

// Pre-configured rate limiters
export const askRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 asks per minute
  message: 'Ask Recallly rate limit exceeded. Please wait a moment before sending more queries.',
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60, // 60 searches per minute
  message: 'Search query rate limit reached. Please wait a few seconds.',
});

export const syncRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5, // 5 manual syncs per 5 minutes
  message: 'Manual sync rate limit reached. X sync is scheduled automatically in the background.',
});

export const exportRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Data export rate limit reached. Please wait before exporting again.',
});

export const accountDeletionRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3,
  message: 'Account deletion rate limit reached.',
});
