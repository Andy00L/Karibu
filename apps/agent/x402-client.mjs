// x402 client harness: pays one of Karibu's x402 services through thirdweb's
// wrapFetchWithPayment and prints the result and the settlement response. Used by
// scripts/e2e.sh to exercise a real settled payment. Self-pays with
// AGENT_PRIVATE_KEY by default; set PAYER_PRIVATE_KEY for a distinct payer. Never
// logs a private key. sourceRef: packages/karibu-skill/src/index.ts.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createThirdwebClient, defineChain } from "thirdweb";
import { privateKeyToAccount, createWalletAdapter } from "thirdweb/wallets";
import { wrapFetchWithPayment } from "thirdweb/x402";

function readEnvValue(envText, key) {
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && match[1] === key) {
      return match[2].trim();
    }
  }
  return "";
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(resolve(scriptDir, "../../.env"), "utf8");
const secretKey = readEnvValue(envText, "THIRDWEB_SECRET_KEY");
const payerRaw = readEnvValue(envText, "PAYER_PRIVATE_KEY") || readEnvValue(envText, "AGENT_PRIVATE_KEY");
const privateKey = payerRaw.startsWith("0x") ? payerRaw : `0x${payerRaw}`;
if (secretKey.length === 0 || privateKey.length < 10) {
  console.error("[x402-client] missing THIRDWEB_SECRET_KEY or a payer private key in .env");
  process.exit(1);
}

const baseUrl = (process.env.KARIBU_URL ?? "http://127.0.0.1:8899").replace(/\/$/, "");
const MAX_VALUE_UNITS = 1_000_000n; // cap any single payment at 1 USDC (6 decimals)

const CHAIN_ID = 11142220; // Celo Sepolia. sourceRef: docs/FACTS.md section 1.
const RPC_URL = "https://forno.celo-sepolia.celo-testnet.org";
const client = createThirdwebClient({ secretKey });
const account = privateKeyToAccount({ client, privateKey });
const chain = defineChain({ id: CHAIN_ID, rpc: RPC_URL });
// wrapFetchWithPayment needs a Wallet (getAccount and getChain), so adapt the
// local private-key account into one. sourceRef: thirdweb x402/fetchWithPayment.js.
const wallet = createWalletAdapter({
  client,
  adaptedAccount: account,
  chain,
  onDisconnect: () => {},
  switchChain: async () => {},
});
const paidFetch = wrapFetchWithPayment(fetch, client, wallet, { maxValue: MAX_VALUE_UNITS });

// Default to the read-only fx-quote. KARIBU_SERVICE=fx-swap exercises the prepay
// swap path (the caller prepays amount + fee, the agent swaps the prepaid USDC).
const service = process.env.KARIBU_SERVICE ?? "fx-quote";
const isSwap = service === "fx-swap";
const targetUrl = isSwap ? `${baseUrl}/api/fx/swap` : `${baseUrl}/api/fx/quote`;
const requestBody = isSwap
  ? { to: process.env.KARIBU_SWAP_TO ?? "USDM", amount: process.env.KARIBU_SWAP_AMOUNT ?? "0.1", recipient: account.address, nonce: randomUUID() }
  : { from: "USDM", to: "USDC", amount: "1" };
console.log(`[x402-client] service=${service} payer=${account.address} target=${targetUrl}`);

try {
  const response = await paidFetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const bodyText = await response.text();
  console.log(`[x402-client] status=${response.status}`);
  console.log(`[x402-client] body=${bodyText.slice(0, 400)}`);
  const settlement = response.headers.get("x-payment-response") ?? response.headers.get("payment-response");
  if (settlement) {
    console.log(`[x402-client] settlement=${settlement.slice(0, 300)}`);
  }
  if (response.status === 200) {
    console.log("X402_PAID_OK");
  } else {
    console.log("X402_PAID_FAIL");
    process.exit(1);
  }
} catch (error) {
  console.error(`[x402-client] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
