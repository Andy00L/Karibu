import { createThirdwebClient, defineChain, type ThirdwebClient } from "thirdweb";
import type { Chain } from "thirdweb/chains";
import { facilitator, settlePayment, type ThirdwebX402Facilitator } from "thirdweb/x402";
import type { ServiceName, KaribuNetwork } from "@karibu/state-contract";
import { SERVICE_PRICE_USD } from "@karibu/state-contract";
import { NETWORK_CONFIG } from "./config.js";
import { logError, logInfo } from "./logger.js";

export type ThirdwebClientResult =
  | { ok: true; client: ThirdwebClient; chain: Chain }
  | { ok: false; reason: string };

// Builds a thirdweb client and chain from the environment. Needs a secret key or
// a client id, NOT the x402 server wallet, so on-chain reads and the notary
// anchor work even before the server wallet is configured. Secrets are never
// logged. sourceRef: docs/FACTS.md section 5.
export function buildThirdwebClient(env: NodeJS.ProcessEnv, network: KaribuNetwork): ThirdwebClientResult {
  const secretKey = env.THIRDWEB_SECRET_KEY ?? "";
  const clientId = env.THIRDWEB_CLIENT_ID ?? "";
  if (secretKey.length === 0 && clientId.length === 0) {
    return { ok: false, reason: "neither THIRDWEB_SECRET_KEY nor THIRDWEB_CLIENT_ID is set" };
  }
  const networkConfig = NETWORK_CONFIG[network];
  const client = secretKey.length > 0 ? createThirdwebClient({ secretKey }) : createThirdwebClient({ clientId });
  const chain = defineChain({ id: networkConfig.chainId, rpc: networkConfig.rpcUrl });
  return { ok: true, client, chain };
}

// The x402 settlement context. The server wallet is the facilitator relayer;
// payTo is the treasury (the agent wallet). sourceRef: docs/FACTS.md section 5.
// The x402 settlement asset (USDC) with the EIP-712 domain the payer signs over.
export type PaymentAsset = { address: string; decimals: number; name: string; version: string };

export type PaymentContext = {
  client: ThirdwebClient;
  x402Facilitator: ThirdwebX402Facilitator;
  chain: Chain;
  payTo: string;
  paymentAsset: PaymentAsset;
};

export type BuildPaymentResult = { ok: true; context: PaymentContext } | { ok: false; reason: string };

export function buildPaymentContext(
  client: ThirdwebClient,
  chain: Chain,
  env: NodeJS.ProcessEnv,
  payTo: string,
  paymentAsset: PaymentAsset,
): BuildPaymentResult {
  const serverWalletAddress = env.THIRDWEB_SERVER_WALLET_ADDRESS ?? "";
  if (serverWalletAddress.length === 0) {
    return { ok: false, reason: "THIRDWEB_SERVER_WALLET_ADDRESS is not set" };
  }
  if (payTo.length === 0) {
    return { ok: false, reason: "AGENT_ADDRESS (payTo treasury) is not set" };
  }
  const x402Facilitator = facilitator({ client, serverWalletAddress });
  logInfo("buildPaymentContext", "x402 payment enabled", { serverWalletConfigured: true });
  return { ok: true, context: { client, x402Facilitator, chain, payTo, paymentAsset } };
}

// The outcome of gating a request. On paid, the caller serves content and sets
// receiptHeaders. Otherwise the caller forwards the status, headers, and body.
export type GateOutcome =
  | { paid: true; receiptHeaders: Record<string, string> }
  | { paid: false; status: number; headers: Record<string, string>; body: unknown };

// Narrows a configured address to the 0x-prefixed form the x402 asset type wants,
// without a type assertion.
function isHexAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

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
  const asset = context.paymentAsset;
  if (!isHexAddress(asset.address)) {
    logError("gatePayment", "payment asset address is malformed", { service });
    return { paid: false, status: 502, headers: {}, body: { error: "payment verification unavailable" } };
  }
  const assetAddress = asset.address;
  // Specify the token explicitly. thirdweb cannot resolve a default asset for the
  // custom-defined Celo Sepolia chain from a USD price, so a string price yields
  // empty payment requirements. amount is in the token's smallest unit; USDC
  // settles via EIP-3009 transferWithAuthorization. sourceRef: thirdweb x402
  // settle-payment.js price object form and schemas.js asset shape.
  const atomicAmount = Math.round(priceUsd * 10 ** asset.decimals).toString();
  try {
    const result = await settlePayment({
      resourceUrl,
      method,
      paymentData,
      payTo: context.payTo,
      network: context.chain,
      price: {
        amount: atomicAmount,
        asset: {
          address: assetAddress,
          decimals: asset.decimals,
          eip712: { name: asset.name, version: asset.version, primaryType: "TransferWithAuthorization" },
        },
      },
      facilitator: context.x402Facilitator,
      // Return once the settlement tx is submitted, not after full confirmation.
      // The hosted facilitator's default "confirmed" wait exceeds the edge timeout
      // on Celo Sepolia and returns HTTP 524. sourceRef: thirdweb x402
      // facilitator.js waitUntil ("confirmed" is the slowest default).
      waitUntil: "submitted",
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
