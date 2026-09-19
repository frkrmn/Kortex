/**
 * Centralized Log Sanitizer & Redactor
 * Automatically redacts sensitive authentication headers, OAuth tokens,
 * Stripe signatures/keys, passwords, and private user credentials from server logs.
 */

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
  /sk_live_[A-Za-z0-9]+/gi,
  /sk_test_[A-Za-z0-9]+/gi,
  /whsec_[A-Za-z0-9]+/gi,
  /AIzaSy[A-Za-z0-9_\-]+/gi,
  /"password"\s*:\s*"[^"]+"/gi,
  /"token"\s*:\s*"[^"]+"/gi,
  /"secret"\s*:\s*"[^"]+"/gi,
  /"accessToken"\s*:\s*"[^"]+"/gi,
  /"refreshToken"\s*:\s*"[^"]+"/gi,
];

export function redactSensitiveData(input: any): any {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    let sanitized = input;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match) => {
        if (match.toLowerCase().startsWith('bearer ')) {
          return 'Bearer [REDACTED_JWT]';
        }
        return '[REDACTED_SECRET]';
      });
    }
    return sanitized;
  }

  if (Array.isArray(input)) {
    return input.map(redactSensitiveData);
  }

  if (typeof input === 'object') {
    const copy: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie') ||
        lowerKey === 'stripe-signature'
      ) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = redactSensitiveData(value);
      }
    }
    return copy;
  }

  return input;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${redactSensitiveData(message)}`, ...args.map(redactSensitiveData));
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${redactSensitiveData(message)}`, ...args.map(redactSensitiveData));
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${redactSensitiveData(message)}`, ...args.map(redactSensitiveData));
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${redactSensitiveData(message)}`, ...args.map(redactSensitiveData));
    }
  },
};
