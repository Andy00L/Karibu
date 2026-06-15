import type { KaribuNetwork, KaribuSnapshot, ServiceName } from "@karibu/state-contract";

const DAY_MS = 24 * 60 * 60 * 1000; // 24 hour activity window, in milliseconds

// Activity metrics measured from server counters. Money figures (revenue, gas)
// live in the SpendTracker and are passed into buildSnapshot, so there is one
// source of truth for money. sourceRef: KARIBU_BUILD_PLAN.md section 2.4.
export class MetricsStore {
  private agentId: string;
  private selfVerified = false;
  private scanScore: number | null = null;
  private readonly network: KaribuNetwork;
  private readonly demoWallets: ReadonlySet<string>;
  private readonly clientWallets = new Set<string>();
  private readonly serviceCallCounts = new Map<ServiceName, number>();
  private readonly txTimestampsMs: number[] = [];
  private feedbackCount = 0;
  // Count of distinct notary anchors already on-chain, read from
  // KaribuNotary.anchorCount at startup. Added to txCountTotal so the dashboard
  // reflects real historical anchors after a redeploy instead of resetting to
  // zero. sourceRef: audit 2026-06-14 (in-memory metrics reset).
  private onchainAnchorBaseline = 0;

  constructor(network: KaribuNetwork, agentId: string, demoWallets: ReadonlySet<string>) {
    this.network = network;
    this.agentId = agentId;
    this.demoWallets = demoWallets;
  }

  setSelfVerified(value: boolean): void {
    this.selfVerified = value;
  }

  setAgentId(value: string): void {
    this.agentId = value;
  }

  setScanScore(value: number | null): void {
    this.scanScore = value;
  }

  // A client-paid call: counts as a transaction, increments the service count,
  // and adds a unique client unless it is one of drew's demo wallets.
  recordServicePaid(service: ServiceName, clientWallet: string | null, nowMs: number): void {
    this.txTimestampsMs.push(nowMs);
    const incremented = (this.serviceCallCounts.get(service) ?? 0) + 1;
    this.serviceCallCounts.set(service, incremented);
    if (clientWallet === null || clientWallet.length === 0) {
      return;
    }
    const normalizedWallet = clientWallet.toLowerCase();
    if (!this.demoWallets.has(normalizedWallet)) {
      this.clientWallets.add(normalizedWallet);
    }
  }

  // Self-initiated activity counts as a transaction but never as client revenue
  // or a unique client. sourceRef: KARIBU_BUILD_PLAN.md section 9.
  recordSelfInitiated(service: ServiceName, nowMs: number): void {
    this.txTimestampsMs.push(nowMs);
    const incremented = (this.serviceCallCounts.get(service) ?? 0) + 1;
    this.serviceCallCounts.set(service, incremented);
  }

  recordFeedback(): void {
    this.feedbackCount += 1;
  }

  // Seeds the count of notary anchors already on-chain so txCountTotal survives a
  // restart. Live anchors in this process add on top of the baseline; the next
  // restart re-reads the now-higher on-chain count, so nothing is double counted.
  // The 24 hour window stays measured from live timestamps only, so a historical
  // anchor never inflates the recent count. sourceRef: audit 2026-06-14.
  seedOnchainAnchors(count: number): void {
    if (Number.isFinite(count) && count >= 0) {
      this.onchainAnchorBaseline = Math.floor(count);
    }
  }

  serviceCallCount(service: ServiceName): number {
    return this.serviceCallCounts.get(service) ?? 0;
  }

  buildSnapshot(nowMs: number, revenueCusd: number, gasPaidCusd: number): KaribuSnapshot {
    const cutoffMs = nowMs - DAY_MS;
    let countLast24h = 0;
    for (const timestampMs of this.txTimestampsMs) {
      if (timestampMs >= cutoffMs) {
        countLast24h += 1;
      }
    }
    return {
      schemaVersion: 1,
      network: this.network,
      agentId: this.agentId,
      selfVerified: this.selfVerified,
      txCountTotal: this.txTimestampsMs.length + this.onchainAnchorBaseline,
      txCount24h: countLast24h,
      uniqueClientWallets: this.clientWallets.size,
      revenueCusd,
      gasPaidCusd,
      feedbackCount: this.feedbackCount,
      scanScore: this.scanScore,
      updatedAtMs: nowMs,
    };
  }
}
