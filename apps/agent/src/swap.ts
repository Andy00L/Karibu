import { createRequire } from "node:module";
import type { Mento } from "@mento-protocol/mento-sdk";
import { getContract, prepareContractCall, prepareTransaction, sendTransaction, waitForReceipt, type ThirdwebClient } from "thirdweb";
import type { Chain } from "thirdweb/chains";
import type { Account } from "thirdweb/wallets";
import { z } from "zod";
import type { KaribuNetwork } from "@karibu/state-contract";
import { FX_TOKENS, TOKEN_DECIMALS, NETWORK_CONFIG } from "./config.js";
import { logError, logInfo } from "./logger.js";

// The Mento SDK ESM build ships extensionless internal imports that break strict
// Node ESM, so load the working CJS build through createRequire. Types still come
// from the package's type definitions. sourceRef: src/fx.ts, docs/DECISIONS.md.
const requireFromHere = createRequire(import.meta.url);
const mentoSdk: typeof import("@mento-protocol/mento-sdk") =
  requireFromHere("@mento-protocol/mento-sdk");

// keccak256("Transfer(address,address,uint256)"). Used to read the exact swap
// output from the receipt logs instead of a balanceOf right after the write,
// which the forno replicas serve stale. sourceRef: docs/DECISIONS.md 2026-06-14.
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Conservative swap settings for a stable pair. sourceRef: KARIBU_BUILD_PLAN.md
// section 2.1 (SVC-3).
const SLIPPAGE_TOLERANCE_PERCENT = 0.5; // maximum acceptable slippage, percent
const DEADLINE_MINUTES = 15; // the swap must mine within this many minutes

// The swap input is always the prepaid USDC (the x402 settlement token), so the
// request carries only the output token, the amount, and the recipient. sourceRef:
// KARIBU_BUILD_PLAN.md 2.1 (SVC-3: the swap amount is prepaid by the caller).
export const fxSwapRequestSchema = z.object({
  to: z.string(),
  amount: z.string(),
  recipient: z.string(),
  // Required: an independent per-request replay key, beyond the single-use
  // EIP-3009 payment nonce the facilitator enforces. sourceRef: audit 2026-06-14.
  nonce: z.string().min(1),
});

export type SwapRuntime = {
  mento: Mento;
  client: ThirdwebClient;
  chain: Chain;
  account: Account;
  tokenAddresses: Readonly<Record<string, string>>;
  explorerBase: string;
};

export type SwapExecution = {
  fromSymbol: string;
  toSymbol: string;
  fromAddress: string;
  toAddress: string;
  recipient: string;
  amountInUnits: string;
  amountOutUnits: string;
  amountOutMinUnits: string;
  txHash: string;
  explorerUrl: string;
};

export type SwapResult = { ok: true; execution: SwapExecution } | { ok: false; reason: string };

// Builds the swap runtime. Reuses the agent thirdweb client, chain, and account
// (the treasury that holds the stables and pays gas), and its own Mento instance
// for building swap calldata. sourceRef: src/fx.ts createFxRuntime.
export async function createSwapRuntime(
  network: KaribuNetwork,
  client: ThirdwebClient,
  chain: Chain,
  account: Account,
): Promise<SwapRuntime> {
  const networkConfig = NETWORK_CONFIG[network];
  const mento = await mentoSdk.Mento.create(networkConfig.chainId, networkConfig.rpcUrl);
  logInfo("createSwapRuntime", "mento swap ready", { network, chainId: networkConfig.chainId });
  return { mento, client, chain, account, tokenAddresses: FX_TOKENS[network], explorerBase: networkConfig.explorerBase };
}

// Converts a decimal token amount to the token's smallest unit. Returns null on
// malformed input or more precision than the token supports. sourceRef: src/fx.ts
// toWei18, generalized to the token's own decimals (USDC is 6, stables are 18).
export function toTokenUnits(amount: string, decimals: number): bigint | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const dotIndex = trimmed.indexOf(".");
  const wholePart = dotIndex === -1 ? trimmed : trimmed.slice(0, dotIndex);
  const fractionRaw = dotIndex === -1 ? "" : trimmed.slice(dotIndex + 1);
  if (fractionRaw.length > decimals) {
    return null;
  }
  const paddedFraction = `${fractionRaw}${"0".repeat(decimals)}`.slice(0, decimals);
  return BigInt(wholePart) * 10n ** BigInt(decimals) + BigInt(paddedFraction);
}

function addressToTopic(address: string): string {
  return `0x000000000000000000000000${address.toLowerCase().replace(/^0x/, "")}`;
}

// Reads the exact amount of `token` transferred to `recipient` from receipt logs.
// Authoritative and lag-free, unlike a balanceOf right after the write. Returns
// null if no matching Transfer is present. sourceRef: docs/DECISIONS.md 2026-06-14.
export function readTransferAmount(
  logs: ReadonlyArray<{ address: string; topics: readonly string[]; data: string }>,
  token: string,
  recipient: string,
): bigint | null {
  const tokenLower = token.toLowerCase();
  const recipientTopic = addressToTopic(recipient);
  let total = 0n;
  let matched = false;
  // Sum every matching Transfer of this token to the recipient in the receipt, so
  // a multi-hop or fee-on-transfer route reports the net received, not just the
  // first leg. Skip a malformed data word instead of throwing after the swap has
  // already moved funds on-chain. sourceRef: audit 2026-06-14.
  for (const log of logs) {
    const topicSignature = log.topics[0]?.toLowerCase();
    const topicTo = log.topics[2]?.toLowerCase();
    const isMatch =
      log.address.toLowerCase() === tokenLower && topicSignature === TRANSFER_EVENT_TOPIC && topicTo === recipientTopic;
    if (isMatch && /^0x[0-9a-fA-F]+$/.test(log.data)) {
      total += BigInt(log.data);
      matched = true;
    }
  }
  return matched ? total : null;
}

function isHexCalldata(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

// Sends one Mento CallParams (to, data) from the agent account, value zero since
// these are ERC-20 calls, and waits for the receipt. May throw on a network or
// revert error; the public executeSwap wraps this in a try/catch.
async function sendCalldata(
  runtime: SwapRuntime,
  callParams: { to: string; data: string },
): Promise<{ transactionHash: string; logs: ReadonlyArray<{ address: string; topics: readonly string[]; data: string }> }> {
  if (!isHexCalldata(callParams.data)) {
    throw new Error("Mento returned malformed calldata");
  }
  const transaction = prepareTransaction({
    client: runtime.client,
    chain: runtime.chain,
    to: callParams.to,
    data: callParams.data,
    value: 0n,
  });
  const sent = await sendTransaction({ transaction, account: runtime.account });
  const receipt = await waitForReceipt({ client: runtime.client, chain: runtime.chain, transactionHash: sent.transactionHash });
  return { transactionHash: sent.transactionHash, logs: receipt.logs };
}

// Executes a Mento swap from the agent treasury, paying the output to recipient.
// Errors as values: unknown symbol, bad amount, bad recipient, missing route,
// insufficient liquidity, or a failed transaction each return { ok: false } with
// a distinct reason. sourceRef: Mento SwapService.buildSwapTransaction.
export async function executeSwap(
  runtime: SwapRuntime,
  fromSymbol: string,
  toSymbol: string,
  amount: string,
  recipient: string,
): Promise<SwapResult> {
  const normalizedFrom = fromSymbol.toUpperCase();
  const normalizedTo = toSymbol.toUpperCase();
  if (normalizedFrom === normalizedTo) {
    return { ok: false, reason: "from and to must be different tokens" };
  }
  const fromAddress = runtime.tokenAddresses[normalizedFrom];
  const toAddress = runtime.tokenAddresses[normalizedTo];
  if (fromAddress === undefined || toAddress === undefined) {
    const known = Object.keys(runtime.tokenAddresses).join(", ");
    return { ok: false, reason: `unknown token symbol; known symbols: ${known}` };
  }
  const fromDecimals = TOKEN_DECIMALS[normalizedFrom as keyof typeof TOKEN_DECIMALS];
  if (fromDecimals === undefined) {
    return { ok: false, reason: `decimals not configured for ${normalizedFrom}` };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) {
    return { ok: false, reason: "recipient must be a 20-byte hex address" };
  }
  if (/^0x0{40}$/.test(recipient)) {
    return { ok: false, reason: "recipient must not be the zero address" };
  }
  const amountInUnits = toTokenUnits(amount, fromDecimals);
  if (amountInUnits === null || amountInUnits <= 0n) {
    return { ok: false, reason: "amount must be a positive number within the token's precision" };
  }

  try {
    const built = await runtime.mento.swap.buildSwapTransaction(
      fromAddress,
      toAddress,
      amountInUnits,
      recipient,
      runtime.account.address,
      { slippageTolerance: SLIPPAGE_TOLERANCE_PERCENT, deadline: mentoSdk.deadlineFromMinutes(DEADLINE_MINUTES) },
    );
    if (built.approval !== null) {
      await sendCalldata(runtime, built.approval);
    }
    const swapSent = await sendCalldata(runtime, built.swap.params);
    const exactOut = readTransferAmount(swapSent.logs, toAddress, recipient);
    const amountOutUnits = exactOut ?? built.swap.expectedAmountOut;
    logInfo("executeSwap", "swap settled", { from: normalizedFrom, to: normalizedTo, txHash: swapSent.transactionHash });
    return {
      ok: true,
      execution: {
        fromSymbol: normalizedFrom,
        toSymbol: normalizedTo,
        fromAddress,
        toAddress,
        recipient,
        amountInUnits: amountInUnits.toString(),
        amountOutUnits: amountOutUnits.toString(),
        amountOutMinUnits: built.swap.amountOutMin.toString(),
        txHash: swapSent.transactionHash,
        explorerUrl: `${runtime.explorerBase}/tx/${swapSent.transactionHash}`,
      },
    };
  } catch (swapError) {
    const message = swapError instanceof Error ? swapError.message : String(swapError);
    const firstLine = message.split("\n")[0] ?? message;
    logError("executeSwap", "swap failed", { error: firstLine });
    return { ok: false, reason: firstLine };
  }
}

export type RefundResult = { ok: true; txHash: string } | { ok: false; reason: string };

// Refunds USDC from the treasury to the payer when a paid swap could not be
// executed, so the caller is made whole. Errors as values. sourceRef: audit
// 2026-06-14.
export async function refundUsdc(runtime: SwapRuntime, payer: string, amountUnits: bigint): Promise<RefundResult> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(payer)) {
    return { ok: false, reason: "refund payer is not a valid address" };
  }
  const usdcAddress = runtime.tokenAddresses["USDC"];
  if (usdcAddress === undefined) {
    return { ok: false, reason: "USDC address not configured for the refund" };
  }
  if (amountUnits <= 0n) {
    return { ok: false, reason: "refund amount must be positive" };
  }
  try {
    const contract = getContract({ client: runtime.client, chain: runtime.chain, address: usdcAddress });
    const transaction = prepareContractCall({
      contract,
      method: "function transfer(address to, uint256 amount) returns (bool)",
      params: [payer, amountUnits],
    });
    const sent = await sendTransaction({ transaction, account: runtime.account });
    logInfo("refundUsdc", "refund sent", { payer, txHash: sent.transactionHash });
    return { ok: true, txHash: sent.transactionHash };
  } catch (refundError) {
    const message = refundError instanceof Error ? refundError.message : String(refundError);
    const firstLine = message.split("\n")[0] ?? message;
    logError("refundUsdc", "refund failed", { error: firstLine });
    return { ok: false, reason: firstLine };
  }
}
