import { privateKeyToAccount } from "thirdweb/wallets";
import { loadConfig, NETWORK_CONFIG } from "./config.js";
import { MetricsStore } from "./metrics.js";
import { EventBus } from "./events.js";
import { SpendTracker } from "./spend-tracker.js";
import { buildServer } from "./server.js";
import { buildPaymentContext, type PaymentContext } from "./payment.js";
import type { NotaryRuntime } from "./notary.js";
import { createFxRuntime, type FxRuntime } from "./fx.js";
import { startMockStream } from "./mock-stream.js";
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

  let payment: PaymentContext | null = null;
  let notaryRuntime: NotaryRuntime | null = null;
  const paymentResult = buildPaymentContext(config, process.env);
  if (paymentResult.ok) {
    payment = paymentResult.context;
    const privateKey = process.env.AGENT_PRIVATE_KEY ?? "";
    const notaryAddress =
      config.network === "celo"
        ? process.env.KARIBU_NOTARY_ADDRESS_MAINNET ?? ""
        : process.env.KARIBU_NOTARY_ADDRESS_SEPOLIA ?? "";
    if (privateKey.length > 0 && notaryAddress.length > 0) {
      const account = privateKeyToAccount({ client: payment.client, privateKey });
      notaryRuntime = {
        client: payment.client,
        chain: payment.chain,
        account,
        notaryAddress,
        explorerBase: NETWORK_CONFIG[config.network].explorerBase,
      };
    } else {
      logInfo("main", "notary runtime disabled", {
        hasPrivateKey: privateKey.length > 0,
        hasNotaryAddress: notaryAddress.length > 0,
      });
    }
  } else {
    logInfo("main", "x402 payment disabled", { reason: paymentResult.reason });
  }

  let fxRuntime: FxRuntime | null = null;
  try {
    fxRuntime = await createFxRuntime(config.network);
  } catch (fxError) {
    const message = fxError instanceof Error ? fxError.message : String(fxError);
    logError("main", "fx runtime init failed", { error: message });
  }

  const app = buildServer({
    config,
    metrics,
    events,
    spendTracker,
    payment,
    notaryRuntime,
    fxRuntime,
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
  } catch (startError) {
    const message = startError instanceof Error ? startError.message : String(startError);
    logError("main", "failed to start server", { error: message });
    process.exitCode = 1;
  }
}

void main();
