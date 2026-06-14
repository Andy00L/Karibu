// Read-only: check whether Mento routes CELO -> cUSD and cUSD -> USDC on Celo
// mainnet, so the agent can self-fund stables by swapping a little of its CELO.
// Builds swap calldata only (no transaction is sent) and prints the expected
// output, or the route error. sourceRef: apps/agent/src/swap.ts (same Mento load
// and buildSwapTransaction call), apps/agent/src/config.ts (mainnet addresses).
import { createRequire } from "node:module";

const requireFromHere = createRequire(import.meta.url);
const mentoSdk = requireFromHere("@mento-protocol/mento-sdk");

const RPC = "https://forno.celo.org";
const OWNER = "0x1147856217691a72C96F36F04697Abfb7305eF9f"; // ownerOf(9373), the treasury
const CELO = "0x471EcE3750Da237f93B8E339c536989b8978a438"; // GoldToken (CELO as ERC-20)
const CUSD = "0x765DE816845861e75A25fCA122bb6898B8B1282a"; // cUSD / USDm, 18dp
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C"; // native USDC, 6dp

const mento = await mentoSdk.Mento.create(42220, RPC);
const deadline = mentoSdk.deadlineFromMinutes(15);

async function checkRoute(label, tokenIn, tokenOut, amountIn) {
  try {
    const built = await mento.swap.buildSwapTransaction(tokenIn, tokenOut, amountIn, OWNER, OWNER, {
      slippageTolerance: 0.5,
      deadline,
    });
    console.log(`${label} ROUTE_OK expectedAmountOut=${built.swap.expectedAmountOut.toString()} amountOutMin=${built.swap.amountOutMin.toString()}`);
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : String(routeError);
    console.log(`${label} ROUTE_ERROR=${message.split("\n")[0]}`);
  }
}

await checkRoute("CELO->cUSD(1 CELO)", CELO, CUSD, 1000000000000000000n);
await checkRoute("cUSD->USDC(1 cUSD)", CUSD, USDC, 1000000000000000000n);
console.log("ROUTE_CHECK_DONE");
