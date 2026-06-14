import { REPLAY_WINDOW_MS } from "@karibu/state-contract";

// Rejects a duplicate request nonce within the replay window. In-memory for now,
// so a process restart clears it; that is acceptable for the demo and is noted
// in docs/MOCKS.md. sourceRef: KARIBU_BUILD_PLAN.md section 2.3.
export class ReplayGuard {
  private readonly seenNonces = new Map<string, number>();

  // Returns true if the nonce is fresh (and records it), false if it is a
  // duplicate within the window. Errors as values via the boolean.
  checkAndRecord(nonce: string, nowMs: number): boolean {
    this.pruneExpired(nowMs);
    const firstSeenMs = this.seenNonces.get(nonce);
    if (firstSeenMs !== undefined && nowMs - firstSeenMs < REPLAY_WINDOW_MS) {
      return false;
    }
    this.seenNonces.set(nonce, nowMs);
    return true;
  }

  private pruneExpired(nowMs: number): void {
    for (const [nonce, firstSeenMs] of this.seenNonces) {
      if (nowMs - firstSeenMs >= REPLAY_WINDOW_MS) {
        this.seenNonces.delete(nonce);
      }
    }
  }

  size(): number {
    return this.seenNonces.size;
  }
}
