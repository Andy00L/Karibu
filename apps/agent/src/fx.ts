import { createRequire } from "node:module";
import type { Mento } from "@mento-protocol/mento-sdk";
import { z } from "zod";
import type { KaribuNetwork } from "@karibu/state-contract";
import { FX_TOKENS, NETWORK_CONFIG } from "./config.js";
import { logInfo } from "./logger.js";

// The Mento SDK ESM build ships extensionless internal imports that break strict
// Node ESM, so load the working CJS build through createRequire. Types still come
// from the package's type definitions. sourceRef: docs/DECISIONS.md 2026-06-13.
const requireFromHere = createRequire(import.meta.url);
const mentoSdk: typeof import("@mento-protocol/mento-sdk") =
  requireFromHere("@mento-protocol/mento-sdk");

export const fxQuoteRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.string(),
});

export type FxQuote = {
  fromSymbol: string;
  toSymbol: string;
  fromAddress: string;
  toAddress: string;
  amountInWei: string;
  amountOutWei: string;
};

export type FxQuoteResult = { ok: true; quote: FxQuote } | { ok: false; reason: string };

export type FxRuntime = {
  mento: Mento;
  tokenAddresses: Readonly<Record<string, string>>;
};

export async function createFxRuntime(network: KaribuNetwork): Promise<FxRuntime> {
  const networkConfig = NETWORK_CONFIG[network];
  const mento = await mentoSdk.Mento.create(networkConfig.chainId, networkConfig.rpcUrl);
  logInfo("createFxRuntime", "mento ready", { network, chainId: networkConfig.chainId });
  return { mento, tokenAddresses: FX_TOKENS[network] };
}

// Converts a decimal token amount to 18-decimal wei. All Mento stables are 18
// decimals. Returns null on malformed input. sourceRef: docs/FACTS.md section 7.
function toWei18(amount: string): bigint | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const dotIndex = trimmed.indexOf(".");
  const wholePart = dotIndex === -1 ? trimmed : trimmed.slice(0, dotIndex);
  const fractionRaw = dotIndex === -1 ? "" : trimmed.slice(dotIndex + 1);
  // Reject more precision than 18 decimals instead of silently truncating, so a
  // quote can never present an over-precise amount as a rounded one. Mirrors
  // toTokenUnits in swap.ts. sourceRef: audit 2026-06-14.
  if (fractionRaw.length > 18) {
    return null;
  }
  const paddedFraction = `${fractionRaw}${"0".repeat(18)}`.slice(0, 18);
  return BigInt(wholePart) * 10n ** 18n + BigInt(paddedFraction);
}

// Gets a Mento quote. Errors as values: unknown symbol, bad amount, a closed FX
// market, a missing route, or a stale rate feed all return { ok: false } with a
// distinct reason rather than throwing.
export async function quoteFx(
  runtime: FxRuntime,
  fromSymbol: string,
  toSymbol: string,
  amount: string,
): Promise<FxQuoteResult> {
  const normalizedFrom = fromSymbol.toUpperCase();
  const normalizedTo = toSymbol.toUpperCase();
  const fromAddress = runtime.tokenAddresses[normalizedFrom];
  const toAddress = runtime.tokenAddresses[normalizedTo];
  if (fromAddress === undefined || toAddress === undefined) {
    const known = Object.keys(runtime.tokenAddresses).join(", ");
    return { ok: false, reason: `unknown token symbol; known symbols: ${known}` };
  }
  const amountInWei = toWei18(amount);
  if (amountInWei === null || amountInWei <= 0n) {
    return { ok: false, reason: "amount must be a positive decimal number" };
  }
  try {
    const amountOutWei = await runtime.mento.quotes.getAmountOut(fromAddress, toAddress, amountInWei);
    return {
      ok: true,
      quote: {
        fromSymbol: normalizedFrom,
        toSymbol: normalizedTo,
        fromAddress,
        toAddress,
        amountInWei: amountInWei.toString(),
        amountOutWei: amountOutWei.toString(),
      },
    };
  } catch (quoteError) {
    const message = quoteError instanceof Error ? quoteError.message : String(quoteError);
    const firstLine = message.split("\n")[0] ?? message;
    return { ok: false, reason: firstLine };
  }
}
