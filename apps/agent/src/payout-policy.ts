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
  // Amounts reserved by an in-flight payout that passed its cap check but has not
  // settled yet. Counting reservations in the cap check closes the check-then-act
  // race where two concurrent calls from one wallet both pass the check before
  // either settles. sourceRef: audit 2026-06-14 (payout-cap TOCTOU).
  private readonly reservedByWallet = new Map<string, number>();

  // Checks a prospective payout against the per-call and daily caps, counting both
  // settled payouts and in-flight reservations. Pure: records nothing. Errors as
  // values: never throws.
  evaluate(walletAddress: string, amountCusd: number, verified: boolean, nowMs: number): PayoutDecision {
    if (amountCusd <= 0) {
      return { ok: false, reason: "payout amount must be positive" };
    }
    const perCallCap = verified ? VERIFIED_PER_CALL_CAP_CUSD : ANONYMOUS_PER_CALL_CAP_CUSD;
    const dailyCap = verified ? VERIFIED_DAILY_CAP_CUSD : ANONYMOUS_DAILY_CAP_CUSD;
    if (amountCusd > perCallCap) {
      return { ok: false, reason: `per-call cap is ${perCallCap} cUSD for this caller` };
    }
    const committed = this.currentDailyTotal(walletAddress, nowMs);
    const reserved = this.reservedByWallet.get(walletAddress.toLowerCase()) ?? 0;
    if (committed + reserved + amountCusd > dailyCap) {
      return { ok: false, reason: `daily cap is ${dailyCap} cUSD for this caller` };
    }
    return { ok: true };
  }

  // Atomically checks the caps and, if the payout fits, reserves the amount so a
  // concurrent call from the same wallet sees it. Call commit() once the payout
  // settles, or release() if it fails. The check and the reservation run with no
  // await between them, so two concurrent reserves cannot both pass.
  reserve(walletAddress: string, amountCusd: number, verified: boolean, nowMs: number): PayoutDecision {
    const decision = this.evaluate(walletAddress, amountCusd, verified, nowMs);
    if (!decision.ok) {
      return decision;
    }
    const key = walletAddress.toLowerCase();
    this.reservedByWallet.set(key, (this.reservedByWallet.get(key) ?? 0) + amountCusd);
    return { ok: true };
  }

  // Settles a reserved payout: releases the reservation and adds it to the wallet's
  // daily total. Call exactly once after reserve() when the payout succeeds.
  commit(walletAddress: string, amountCusd: number, nowMs: number): void {
    this.release(walletAddress, amountCusd);
    this.record(walletAddress, amountCusd, nowMs);
  }

  // Releases a reservation without settling it, for a payout that reserved but then
  // failed (a refund path). Never lets the reserved total go negative.
  release(walletAddress: string, amountCusd: number): void {
    const key = walletAddress.toLowerCase();
    const reserved = this.reservedByWallet.get(key) ?? 0;
    const remaining = reserved - amountCusd;
    if (remaining > 0) {
      this.reservedByWallet.set(key, remaining);
    } else {
      this.reservedByWallet.delete(key);
    }
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
