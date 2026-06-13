import { logInfo, logWarn } from "./logger.js";

// Stop and report at 80 percent of available funds. sourceRef: plan section 7.
const STOP_THRESHOLD_FRACTION = 0.8;

export type SpendDecision = { ok: true } | { ok: false; reason: string };

export type SpendStatus = {
  spentCusd: number;
  revenueCusd: number;
  grantCusd: number;
  availableCusd: number;
  netCusd: number;
  fractionUsed: number;
};

// Tracks cumulative mainnet spend and revenue and enforces the money policy.
// Available funds are the grant plus revenue earned, never more. sourceRef:
// KARIBU_BUILD_PLAN.md section 7.
export class SpendTracker {
  private spentCusd = 0;
  private revenueCusd = 0;
  private readonly grantCusd: number;

  constructor(grantCusd: number) {
    this.grantCusd = grantCusd;
  }

  availableCusd(): number {
    return this.grantCusd + this.revenueCusd;
  }

  recordRevenue(amountCusd: number): void {
    this.revenueCusd += amountCusd;
    this.logStatus("recordRevenue");
  }

  recordSpend(amountCusd: number): void {
    this.spentCusd += amountCusd;
    this.logStatus("recordSpend");
  }

  // Checks a prospective spend before sending. Refuses if it would exceed funds
  // or reach the 80 percent stop threshold. Errors as values, never throws.
  canSpend(amountCusd: number): SpendDecision {
    const available = this.availableCusd();
    const projected = this.spentCusd + amountCusd;
    if (projected > available) {
      return { ok: false, reason: `spend ${projected} exceeds available ${available}` };
    }
    if (available > 0 && projected / available >= STOP_THRESHOLD_FRACTION) {
      return {
        ok: false,
        reason: `spend ${projected} reaches the 80 percent stop threshold of ${available}`,
      };
    }
    return { ok: true };
  }

  status(): SpendStatus {
    const available = this.availableCusd();
    const fractionUsed = available > 0 ? this.spentCusd / available : 0;
    return {
      spentCusd: this.spentCusd,
      revenueCusd: this.revenueCusd,
      grantCusd: this.grantCusd,
      availableCusd: available,
      netCusd: this.revenueCusd - this.spentCusd,
      fractionUsed: Number(fractionUsed.toFixed(4)),
    };
  }

  private logStatus(functionName: string): void {
    const current = this.status();
    const fields = {
      spentCusd: current.spentCusd,
      revenueCusd: current.revenueCusd,
      grantCusd: current.grantCusd,
      availableCusd: current.availableCusd,
      netCusd: current.netCusd,
      fractionUsed: current.fractionUsed,
    };
    if (current.fractionUsed >= STOP_THRESHOLD_FRACTION) {
      logWarn("SpendTracker", "spend reached 80 percent of available funds", fields);
    } else {
      logInfo("SpendTracker", `status after ${functionName}`, fields);
    }
  }
}
