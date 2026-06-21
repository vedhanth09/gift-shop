/**
 * Minimal in-memory rate limiter for the admin login endpoint.
 * PRD §9.1: max 5 failed attempts -> 15-minute lockout.
 *
 * NOTE: in-memory state is per-instance. For multi-instance / serverless
 * production, back this with Redis or MongoDB. Adequate for MVP foundation.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface Attempt {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

const store = new Map<string, Attempt>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Window expired — reset.
  if (now - entry.firstAt > WINDOW_MS) {
    store.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS, retryAfterSeconds: 0 };
  }

  return {
    allowed: entry.count < MAX_ATTEMPTS,
    remaining: Math.max(0, MAX_ATTEMPTS - entry.count),
    retryAfterSeconds: 0,
  };
}

/** Record a failed attempt and lock out once the threshold is reached. */
export function registerFailure(key: string): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + WINDOW_MS;
  }
  store.set(key, entry);
}

/** Clear attempts after a successful login. */
export function resetRateLimit(key: string): void {
  store.delete(key);
}
