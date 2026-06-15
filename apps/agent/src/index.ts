import { privateKeyToAccount } from "thirdweb/wallets";
import { loadConfig, NETWORK_CONFIG, USDC_PAYMENT_ASSET } from "./config.js";
import { MetricsStore } from "./metrics.js";
import { EventBus } from "./events.js";
import { SpendTracker } from "./spend-tracker.js";
import { buildServer } from "./server.js";
import { buildThirdwebClient, buildPaymentContext, type PaymentContext } from "./payment.js";
import { readAnchorCount, type NotaryRuntime } from "./notary.js";
import { createFxRuntime, type FxRuntime } from "./fx.js";
import { createSwapRuntime, type SwapRuntime } from "./swap.js";
import { PayoutPolicy } from "./payout-policy.js";
import { startMockStream } from "./mock-stream.js";
import { createSelfVerifier } from "./self.js";
import { ReplayGuard } from "./replay-guard.js";
import { RateLimiter } from "./rate-limiter.js";
import { startTelegramBot } from "./telegram.js";
import { logError, logInfo } from "./logger.js";

async function main(): Promise<void> {
  const configResult = loadConfig(process.env);
  if (!configResult.ok) {
    logError("main", "invalid configuration", { error: configResult.error });
    process.exitCode = 1;
    return;
  }
  const config = configResult.config;
  const now = (): number => Date.now();
  const startedAtMs = now();

  const metrics = new MetricsStore(config.network, config.agentId, config.demoWallets);
  const events = new EventBus();
  // The grant is 0 in MODE T (testnet-first). sourceRef: KARIBU_BUILD_PLAN.md section 7.
  const spendTracker = new SpendTracker(0);
  const selfVerifier = createSelfVerifier(config.network);
  const replayGuard = new ReplayGuard();
  // The FX payout caps from section 2.3, enforced per caller, per call and per day.
  const payoutPolicy = new PayoutPolicy();
  // 120 requests per minute per client IP. sourceRef: KARIBU_BUILD_PLAN.md Day 3.
  const rateLimiter = new RateLimiter(120, 60 * 1000);

  let payment: PaymentContext | null = null;
  let notaryRuntime: NotaryRuntime | null = null;
  let swapRuntime: SwapRuntime | null = null;
  const clientResult = buildThirdwebClient(process.env, config.network);
  if (clientResult.ok) {
    const thirdwebClient = clientResult.client;
    const thirdwebChain = clientResult.chain;
    const privateKey = process.env.AGENT_PRIVATE_KEY ?? "";
    const notaryAddress =
      config.network === "celo"
        ? process.env.KARIBU_NOTARY_ADDRESS_MAINNET ?? ""
        : process.env.KARIBU_NOTARY_ADDRESS_SEPOLIA ?? "";
    if (privateKey.length > 0) {
      const account = privateKeyToAccount({ client: thirdwebClient, privateKey });
      if (notaryAddress.length > 0) {
        notaryRuntime = {
          client: thirdwebClient,
          chain: thirdwebChain,
          account,
          notaryAddress,
          explorerBase: NETWORK_CONFIG[config.network].explorerBase,
        };
      } else {
        logInfo("main", "notary runtime disabled", { reason: "no notary address for this network" });
      }
      // The agent treasury swaps from this same account. Mento init is a network
      // call, so a failure only disables fx-swap, not the rest of the server.
      try {
        swapRuntime = await createSwapRuntime(config.network, thirdwebClient, thirdwebChain, account);
      } catch (swapInitError) {
        const message = swapInitError instanceof Error ? swapInitError.message : String(swapInitError);
        logError("main", "swap runtime init failed", { error: message });
      }
    } else {
      logInfo("main", "notary and swap runtimes disabled", { reason: "AGENT_PRIVATE_KEY not set" });
    }
    // The x402 settlement context needs the server wallet; the notary runtime
    // above does not, so reads and anchoring work without it.
    const paymentResult = buildPaymentContext(
      thirdwebClient,
      thirdwebChain,
      process.env,
      config.agentAddress,
      USDC_PAYMENT_ASSET[config.network],
    );
    if (paymentResult.ok) {
      payment = paymentResult.context;
    } else {
      logInfo("main", "x402 payment disabled", { reason: paymentResult.reason });
    }
  } else {
    logInfo("main", "thirdweb client unavailable", { reason: clientResult.reason });
  }

  let fxRuntime: FxRuntime | null = null;
  try {
    fxRuntime = await createFxRuntime(config.network);
  } catch (fxError) {
    const message = fxError instanceof Error ? fxError.message : String(fxError);
    logError("main", "fx runtime init failed", { error: message });
  }

  // Seed txCountTotal from the on-chain anchor count so the dashboard reflects real
  // historical anchors after a redeploy, not zero. sourceRef: audit 2026-06-14.
  if (notaryRuntime !== null) {
    const anchorCountResult = await readAnchorCount(notaryRuntime);
    if (anchorCountResult.ok) {
      metrics.seedOnchainAnchors(anchorCountResult.count);
      logInfo("main", "seeded tx count from on-chain anchors", { anchorCount: anchorCountResult.count });
    } else {
      logInfo("main", "could not seed on-chain anchor count", { reason: anchorCountResult.reason });
    }
  }

  const app = buildServer({
    config,
    metrics,
    events,
    spendTracker,
    payment,
    notaryRuntime,
    fxRuntime,
    swapRuntime,
    selfVerifier,
    replayGuard,
    payoutPolicy,
    rateLimiter,
    startedAtMs,
    now,
  });
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    logInfo("main", "agent listening", {
      port: config.port,
      network: config.network,
      x402: payment !== null,
      notary: notaryRuntime !== null,
      fx: fxRuntime !== null,
    });
    if (config.mockStream) {
      startMockStream({ events, metrics, spendTracker, now });
    }
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
    if (telegramToken.length > 0 && process.env.TELEGRAM_BOT_ENABLED === "1") {
      const botResult = await startTelegramBot(telegramToken, {
        fxRuntime,
        notaryRuntime,
        selfVerifier,
        events,
      });
      if (botResult.ok) {
        logInfo("main", "telegram bot live", { username: botResult.handle.username });
      } else {
        logInfo("main", "telegram bot not started", { reason: botResult.reason });
      }
    } else if (telegramToken.length > 0) {
      logInfo("main", "telegram bot available but disabled; set TELEGRAM_BOT_ENABLED=1 to go live");
    }
  } catch (startError) {
    const message = startError instanceof Error ? startError.message : String(startError);
    logError("main", "failed to start server", { error: message });
    process.exitCode = 1;
  }
}

void main();
