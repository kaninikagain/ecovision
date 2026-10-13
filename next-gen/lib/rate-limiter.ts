/**
 * In-memory sliding window rate limiter.
 * Protects Next.js API routes from abuse, DoS, and quota exhaustion.
 * Automatically evicts stale buckets to guarantee zero memory leaks over long up-times.
 */

interface RateLimitRecord {
  timestamps: number[];
  lastSeen: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(windowMs: number = 60000, maxRequests: number = 20) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic sweep every 2 minutes to free memory from inactive IPs
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 120000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  public check(
    ip: string,
    customLimit?: number
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetInSeconds: number;
  } {
    const now = Date.now();
    const limit = customLimit || this.maxRequests;
    const windowStart = now - this.windowMs;

    let record = this.store.get(ip);
    if (!record) {
      record = { timestamps: [], lastSeen: now };
      this.store.set(ip, record);
    }

    // Filter out timestamps outside the active sliding window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);
    record.lastSeen = now;

    if (record.timestamps.length >= limit) {
      const oldestInWindow = record.timestamps[0];
      const resetInMs = oldestInWindow + this.windowMs - now;
      const resetInSeconds = Math.max(1, Math.ceil(resetInMs / 1000));

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetInSeconds,
      };
    }

    // Record this hit
    record.timestamps.push(now);
    const remaining = Math.max(0, limit - record.timestamps.length);
    const resetInSeconds = Math.ceil(this.windowMs / 1000);

    return {
      allowed: true,
      limit,
      remaining,
      resetInSeconds,
    };
  }

  private cleanup() {
    const now = Date.now();
    const threshold = now - this.windowMs * 2;
    for (const [ip, record] of this.store.entries()) {
      if (record.lastSeen < threshold) {
        this.store.delete(ip);
      }
    }
  }
}

// Global singleton instance so it persists across Next.js API invocations in the same Node process
const globalForRateLimit = global as unknown as { rateLimiterInstance?: InMemoryRateLimiter };

export const rateLimiter =
  globalForRateLimit.rateLimiterInstance ||
  new InMemoryRateLimiter(60000, parseInt(process.env.RATE_PER_MIN || '20', 10));

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.rateLimiterInstance = rateLimiter;
}

/**
 * Extracts true client IP behind Cloudflare, Vercel, or standard reverse proxies.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}
