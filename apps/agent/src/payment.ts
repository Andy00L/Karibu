import { createThirdwebClient, defineChain, type ThirdwebClient } from "thirdweb";
import type { Chain } from "thirdweb/chains";
import { facilitator, settlePayment, type ThirdwebX402Facilitator } from "thirdweb/x402";
import type { ServiceName } from "@karibu/state-contract";
import { SERVICE_PRICE_USD } from "@karibu/state-contract";
import type { AgentConfig } from "./config.js";
import { NETWORK_CONFIG } from "./config.js";
import { logError, logInfo } from "./logger.js";

// Reads x402 credentials from the environment at runtime. Secrets are never
// logged. THIRDWEB_SECRET_KEY and THIRDWEB_SERVER_WALLET_ADDRESS come from .env;
// the server wallet is the facilitator relayer, payTo is the treasury (the
// agent wallet). sourceRef: docs/FACTS.md section 5.
export type PaymentContext = {
  client: ThirdwebClient;
  x402Facilitator: ThirdwebX402Facilitator;
  chain: Chain;
  payTo: string;
};

export type BuildPaymentResult =
  | { ok: true; context: PaymentContext }
  | { ok: false; reason: string };

export function buildPaymentContext(config: AgentConfig, env: NodeJS.ProcessEnv): BuildPaymentResult {
  const secretKey = env.THIRDWEB_SECRET_KEY ?? "";
  const serverWalletAddress = env.THIRDWEB_SERVER_WALLET_ADDRESS ?? "";
  const payTo = config.agentAddress;
  if (secretKey.length === 0) {
    return { ok: false, reason: "THIRDWEB_SECRET_KEY is not set" };
  }
  if (serverWalletAddress.length === 0) {
    return { ok: false, reason: "THIRDWEB_SERVER_WALLET_ADDRESS is not set" };
  }
  if (payTo.length === 0) {
    return { ok: false, reason: "AGENT_ADDRESS (payTo treasury) is not set" };
  }
  const networkConfig = NETWORK_CONFIG[config.network];
  const client = createThirdwebClient({ secretKey });
  const chain = defineChain({ id: networkConfig.chainId, rpc: networkConfig.rpcUrl });
  const x402Facilitator = facilitator({ client, serverWalletAddress });
  logInfo("buildPaymentContext", "x402 payment enabled", {
    network: config.network,
    chainId: networkConfig.chainId,
  });
  return { ok: true, context: { client, x402Facilitator, chain, payTo } };
}

// The outcome of gating a request. On paid, the caller serves content and sets
// receiptHeaders. Otherwise the caller forwards the status, headers, and body.
export type GateOutcome =
  | { paid: true; receiptHeaders: Record<string, string> }
  | { paid: false; status: number; headers: Record<string, string>; body: unknown };

// Verifies and settles an x402 payment for one service call. Errors as values:
// a facilitator or network failure returns a 502 outcome instead of throwing.
export async function gatePayment(
  context: PaymentContext,
  service: ServiceName,
  resourceUrl: string,
  method: "GET" | "POST",
  paymentData: string | null,
): Promise<GateOutcome> {
  const priceUsd = SERVICE_PRICE_USD[service];
  try {
    const result = await settlePayment({
      resourceUrl,
      method,
      paymentData,
      payTo: context.payTo,
      network: context.chain,
      price: `$${priceUsd}`,
      facilitator: context.x402Facilitator,
      routeConfig: {
        description: `Karibu ${service} service`,
        mimeType: "application/json",
      },
    });
    if (result.status === 200) {
      return { paid: true, receiptHeaders: result.responseHeaders };
    }
    logInfo("gatePayment", "payment required", { service, status: result.status });
    return {
      paid: false,
      status: result.status,
      headers: result.responseHeaders,
      body: result.responseBody,
    };
  } catch (settleError) {
    const message = settleError instanceof Error ? settleError.message : String(settleError);
    logError("gatePayment", "settlePayment failed", { service, error: message });
    return { paid: false, status: 502, headers: {}, body: { error: "payment verification unavailable" } };
  }
}
