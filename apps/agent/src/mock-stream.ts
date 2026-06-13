import { SERVICE_PRICE_USD } from "@karibu/state-contract";
import type { EventBus } from "./events.js";
import type { MetricsStore } from "./metrics.js";
import type { SpendTracker } from "./spend-tracker.js";
import { logInfo } from "./logger.js";

// Interval between synthetic events. sourceRef: KARIBU_BUILD_PLAN.md section 2.4.
const MOCK_INTERVAL_MS = 3000;
// Clearly-labeled sample client wallets. These are not real addresses; they only
// exist so the dashboard has data to render during development. sourceRef:
// docs/MOCKS.md.
const MOCK_CLIENT_WALLETS = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
];

export type MockStreamDeps = {
  events: EventBus;
  metrics: MetricsStore;
  spendTracker: SpendTracker;
  now: () => number;
};

// Dev-only synthetic event generator so the dashboard can be skinned against a
// live-looking stream. Every value here is sample data, never real activity, and
// the whole mode is off for the real demo (MOCK_STREAM unset). sourceRef:
// KARIBU_BUILD_PLAN.md sections 2.4 and 9, and docs/MOCKS.md.
export function startMockStream(deps: MockStreamDeps): () => void {
  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    const nowMs = deps.now();
    const fallbackWallet = "0x0000000000000000000000000000000000000000";
    const clientWallet = MOCK_CLIENT_WALLETS[tick % MOCK_CLIENT_WALLETS.length] ?? fallbackWallet;
    const mockTxHash = `0xmock${tick.toString(16).padStart(60, "0")}`;
    const phase = tick % 4;
    if (phase === 0) {
      deps.spendTracker.recordRevenue(SERVICE_PRICE_USD.verify);
      deps.metrics.recordServicePaid("verify", clientWallet, nowMs);
      deps.events.emit({
        type: "service_paid",
        service: "verify",
        clientWallet,
        amountUsd: SERVICE_PRICE_USD.verify,
        txHash: mockTxHash,
        selfInitiated: false,
      });
    } else if (phase === 1) {
      deps.spendTracker.recordRevenue(SERVICE_PRICE_USD.notary);
      deps.metrics.recordServicePaid("notary", clientWallet, nowMs);
      deps.events.emit({ type: "notary_anchored", sha256: mockTxHash, txHash: mockTxHash, selfInitiated: false });
    } else if (phase === 2) {
      deps.metrics.recordFeedback();
      deps.events.emit({ type: "feedback_received", clientWallet, score: 90 + (tick % 10) });
    } else {
      deps.events.emit({
        type: "human_verified",
        walletShort: `${clientWallet.slice(0, 6)}...${clientWallet.slice(-4)}`,
      });
    }
  }, MOCK_INTERVAL_MS);
  logInfo("startMockStream", "mock stream enabled (DEV ONLY, not real activity)", {
    intervalMs: MOCK_INTERVAL_MS,
  });
  return () => {
    clearInterval(timer);
  };
}
