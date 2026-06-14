// Fixed-window in-memory rate limiter, keyed by client IP. In-memory is fine for
// a single instance during the hackathon; a restart clears it. sourceRef:
// KARIBU_BUILD_PLAN.md Day 3 hardening (rate limits).
export class RateLimiter {
  private readonly windows = new Map<string, { windowStartMs: number; count: number }>();
  private readonly maxPerWindow: number;
  private readonly windowMs: number;

  constructor(maxPerWindow: number, windowMs: number) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
  }

  // Returns true if the request is allowed (and counts it), false if it is over
  // the limit for the current window.
  check(key: string, nowMs: number): boolean {
    const existing = this.windows.get(key);
    if (existing === undefined || nowMs - existing.windowStartMs >= this.windowMs) {
      this.windows.set(key, { windowStartMs: nowMs, count: 1 });
      return true;
    }
    if (existing.count >= this.maxPerWindow) {
      return false;
    }
    existing.count += 1;
    return true;
  }
}
