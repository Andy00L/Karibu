import {
  ANONYMOUS_PER_CALL_CAP_CUSD,
  ANONYMOUS_DAILY_CAP_CUSD,
  VERIFIED_PER_CALL_CAP_CUSD,
  VERIFIED_DAILY_CAP_CUSD,
} from "@karibu/state-contract";

const DAY_MS = 24 * 60 * 60 * 1000; // rolling daily window, in milliseconds

export type PayoutDecision = { ok: true } | { ok: false; reason: string };

// Enforces the per-call and per-wallet daily FX payout caps. Anonymous callers
// have low caps; Self-verified callers have higher caps. Daily totals reset on a
// rolling 24 hour window, per wallet. This is the treasury-safety core of
// SVC-3; the Mento swap execution wires on top of it. sourceRef:
// KARIBU_BUILD_PLAN.md section 2.3.
export class PayoutPolicy {
  private readonly dailyByWallet = new Map<string, { windowStartMs: number; totalCusd: number }>();

  // Checks a prospective payout against the per-call and daily caps for the
  // caller. Errors as values: never throws. Call record() after a payout settles.
  evaluate(walletAddress: string, amountCusd: number, verified: boolean, nowMs: number): PayoutDecision {
    if (amountCusd <= 0) {
      return { ok: false, reason: "payout amount must be positive" };
    }
    const perCallCap = verified ? VERIFIED_PER_CALL_CAP_CUSD : ANONYMOUS_PER_CALL_CAP_CUSD;
    const dailyCap = verified ? VERIFIED_DAILY_CAP_CUSD : ANONYMOUS_DAILY_CAP_CUSD;
    if (amountCusd > perCallCap) {
      return { ok: false, reason: `per-call cap is ${perCallCap} cUSD for this caller` };
    }
    const priorTotal = this.currentDailyTotal(walletAddress, nowMs);
    if (priorTotal + amountCusd > dailyCap) {
      return { ok: false, reason: `daily cap is ${dailyCap} cUSD for this caller` };
    }
    return { ok: true };
  }

  // Records a completed payout so it counts toward the wallet's daily total.
  record(walletAddress: string, amountCusd: number, nowMs: number): void {
    const key = walletAddress.toLowerCase();
    const priorTotal = this.currentDailyTotal(walletAddress, nowMs);
    const existing = this.dailyByWallet.get(key);
    const windowActive = existing !== undefined && nowMs - existing.windowStartMs < DAY_MS;
    const windowStartMs = windowActive && existing !== undefined ? existing.windowStartMs : nowMs;
    this.dailyByWallet.set(key, { windowStartMs, totalCusd: priorTotal + amountCusd });
  }

  private currentDailyTotal(walletAddress: string, nowMs: number): number {
    const existing = this.dailyByWallet.get(walletAddress.toLowerCase());
    if (existing === undefined || nowMs - existing.windowStartMs >= DAY_MS) {
      return 0;
    }
    return existing.totalCusd;
  }
}
