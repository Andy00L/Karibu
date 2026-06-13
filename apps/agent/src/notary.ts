import { getContract, prepareContractCall, sendTransaction, type ThirdwebClient } from "thirdweb";
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
});

export type AnchorResult =
  | { ok: true; sha256: string; txHash: string; explorerUrl: string }
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
  const transaction = prepareContractCall({
    contract,
    method: "function anchor(bytes32 sha256Hash) returns (uint256)",
    params: [candidate],
  });
  try {
    const sent = await sendTransaction({ transaction, account: runtime.account });
    const explorerUrl = `${runtime.explorerBase}/tx/${sent.transactionHash}`;
    logInfo("anchorSha256", "anchored", { txHash: sent.transactionHash });
    return { ok: true, sha256: candidate, txHash: sent.transactionHash, explorerUrl };
  } catch (anchorError) {
    const message = anchorError instanceof Error ? anchorError.message : String(anchorError);
    logError("anchorSha256", "anchor transaction failed", { error: message });
    return { ok: false, reason: message };
  }
}
