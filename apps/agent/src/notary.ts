import { getContract, prepareContractCall, readContract, sendTransaction, type ThirdwebClient } from "thirdweb";
import type { Chain } from "thirdweb/chains";
import type { Account } from "thirdweb/wallets";
import { z } from "zod";
import { logError, logInfo } from "./logger.js";

// What the notary handler needs to anchor on-chain: the thirdweb client and
// chain, the agent account that signs and pays gas, the deployed notary
// address, and the explorer base for building the receipt link.
export type NotaryRuntime = {
  client: ThirdwebClient;
  chain: Chain;
  account: Account;
  notaryAddress: string;
  explorerBase: string;
};

export const notaryRequestSchema = z.object({
  sha256: z.string(),
  nonce: z.string().optional(),
});

export const receiptParamsSchema = z.object({
  hash: z.string(),
});

export type AnchorResult =
  | { ok: true; sha256: string; txHash: string; explorerUrl: string; alreadyAnchored: false }
  | { ok: true; sha256: string; explorerUrl: string; alreadyAnchored: true }
  | { ok: false; reason: string };

// Narrows a string to a 0x-prefixed 32-byte hex without a type assertion.
function isSha256Hex(value: string): value is `0x${string}` {
  return /^0x[0-9a-f]{64}$/.test(value);
}

function normalizeSha256(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

// Anchors a sha256 hash through KaribuNotary.anchor. The agent account pays gas.
// Errors as values: a bad input or a failed transaction returns { ok: false }.
export async function anchorSha256(runtime: NotaryRuntime, sha256Input: string): Promise<AnchorResult> {
  const candidate = normalizeSha256(sha256Input);
  if (!isSha256Hex(candidate)) {
    return { ok: false, reason: "sha256 must be 32 bytes of hex, optionally 0x-prefixed" };
  }
  const contract = getContract({
    client: runtime.client,
    chain: runtime.chain,
    address: runtime.notaryAddress,
  });
  try {
    // Idempotent: if the hash is already anchored (a duplicate, or a front-runner
    // anchored it first), the content is provably notarized, so return the existing
    // receipt instead of reverting with AlreadyAnchored. The caller always gets a
    // valid receipt. sourceRef: audit 2026-06-14 (notary front-running).
    const alreadyAnchored = await readContract({
      contract,
      method: "function isAnchored(bytes32) view returns (bool)",
      params: [candidate],
    });
    if (alreadyAnchored) {
      logInfo("anchorSha256", "already anchored", { sha256: candidate });
      return {
        ok: true,
        sha256: candidate,
        explorerUrl: `${runtime.explorerBase}/address/${runtime.notaryAddress}`,
        alreadyAnchored: true,
      };
    }
    const transaction = prepareContractCall({
      contract,
      method: "function anchor(bytes32 sha256Hash) returns (uint256)",
      params: [candidate],
    });
    const sent = await sendTransaction({ transaction, account: runtime.account });
    const explorerUrl = `${runtime.explorerBase}/tx/${sent.transactionHash}`;
    logInfo("anchorSha256", "anchored", { txHash: sent.transactionHash });
    return { ok: true, sha256: candidate, txHash: sent.transactionHash, explorerUrl, alreadyAnchored: false };
  } catch (anchorError) {
    const message = anchorError instanceof Error ? anchorError.message : String(anchorError);
    logError("anchorSha256", "anchor transaction failed", { error: message });
    return { ok: false, reason: message };
  }
}

export type AnchorCountResult = { ok: true; count: number } | { ok: false; reason: string };

// Reads the total number of distinct hashes anchored, on-chain and read-only.
// Used at startup to seed the dashboard tx count so it reflects real historical
// anchors after a restart instead of resetting to zero. Errors as values.
// sourceRef: audit 2026-06-14 (in-memory metrics reset on redeploy).
export async function readAnchorCount(runtime: NotaryRuntime): Promise<AnchorCountResult> {
  const contract = getContract({ client: runtime.client, chain: runtime.chain, address: runtime.notaryAddress });
  try {
    const count = await readContract({
      contract,
      method: "function anchorCount() view returns (uint256)",
      params: [],
    });
    return { ok: true, count: Number(count) };
  } catch (readError) {
    const message = readError instanceof Error ? readError.message : String(readError);
    return { ok: false, reason: message };
  }
}

export type NotaryReceipt =
  | {
      ok: true;
      anchored: true;
      sha256: string;
      anchorer: string;
      timestampSec: number;
      index: number;
      explorerUrl: string;
    }
  | { ok: true; anchored: false; sha256: string }
  | { ok: false; reason: string };

// Reads a notary receipt by hash, on-chain and read-only. Errors as values.
export async function readNotaryReceipt(runtime: NotaryRuntime, sha256Input: string): Promise<NotaryReceipt> {
  const candidate = normalizeSha256(sha256Input);
  if (!isSha256Hex(candidate)) {
    return { ok: false, reason: "sha256 must be 32 bytes of hex, optionally 0x-prefixed" };
  }
  const contract = getContract({
    client: runtime.client,
    chain: runtime.chain,
    address: runtime.notaryAddress,
  });
  try {
    const anchored = await readContract({
      contract,
      method: "function isAnchored(bytes32) view returns (bool)",
      params: [candidate],
    });
    if (!anchored) {
      return { ok: true, anchored: false, sha256: candidate };
    }
    const record = await readContract({
      contract,
      method: "function getRecord(bytes32) view returns (address, uint256, uint256)",
      params: [candidate],
    });
    return {
      ok: true,
      anchored: true,
      sha256: candidate,
      anchorer: record[0],
      timestampSec: Number(record[1]),
      index: Number(record[2]),
      explorerUrl: `${runtime.explorerBase}/address/${runtime.notaryAddress}`,
    };
  } catch (readError) {
    const message = readError instanceof Error ? readError.message : String(readError);
    return { ok: false, reason: message };
  }
}
