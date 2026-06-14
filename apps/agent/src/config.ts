import { z } from "zod";
import type { KaribuNetwork } from "@karibu/state-contract";

// Per-network on-chain addresses, all second-verified on-chain in Phase 0.
// sourceRef: docs/FACTS.md sections 1 (networks), 3 (ERC-8004), 7 (Mento).
export const NETWORK_CONFIG = {
  "celo-sepolia": {
    chainId: 11142220,
    rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
    explorerBase: "https://celo-sepolia.blockscout.com",
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    usdmToken: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
    mentoBroker: "0xB9Ae2065142EB79b6c5EB1E8778F883fad6B07Ba",
  },
  celo: {
    chainId: 42220,
    rpcUrl: "https://forno.celo.org",
    explorerBase: "https://celoscan.io",
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    usdmToken: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    mentoBroker: "0x777A8255cA72412f0d706dc03C9D1987306B4CaD",
  },
} as const satisfies Record<KaribuNetwork, unknown>;

// FX token symbol to address, per network. The plan uses the historical
// c-prefixed names; the live Mento brand uses the m-suffix. Both alias to the
// same address. All Mento stables are 18 decimals. sourceRef: docs/FACTS.md
// section 7 (Mento addresses, all second-verified on-chain in Phase 0).
export const FX_TOKENS = {
  "celo-sepolia": {
    USDM: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
    CUSD: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
    KESM: "0xC7e4635651E3e3Af82b61d3E23c159438daE3BbF",
    CKES: "0xC7e4635651E3e3Af82b61d3E23c159438daE3BbF",
    EURM: "0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a",
    CEUR: "0xA99dC247d6b7B2E3ab48a1fEE101b83cD6aCd82a",
    USDC: "0x01C5C0122039549AD1493B8220cABEdD739BC44E",
    BRLM: "0x2294298942fdc79417DE9E0D740A4957E0e7783a",
  },
  celo: {
    USDM: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    CUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    KESM: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
    CKES: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0",
    EURM: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    CEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73",
    USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    BRLM: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787",
  },
} as const satisfies Record<KaribuNetwork, Record<string, string>>;

// Decimals per token symbol, identical on both networks. USDC is 6 decimals;
// every Mento stable is 18. A swap must scale the input amount by the input
// token's own decimals, so USDC cannot reuse the 18-decimal path. sourceRef:
// docs/FACTS.md section 7 (USDC 6dp and USDm 18dp, second-verified on-chain).
export const TOKEN_DECIMALS = {
  USDM: 18,
  CUSD: 18,
  KESM: 18,
  CKES: 18,
  EURM: 18,
  CEUR: 18,
  BRLM: 18,
  USDC: 6,
} as const satisfies Record<string, number>;

// USDC as the x402 settlement asset per network, with the EIP-712 domain that
// the transferWithAuthorization signature needs. The Sepolia USDC name() and
// version() read "USDC" and "2" on-chain. Mainnet must be re-verified before the
// first mainnet x402 settlement. sourceRef: cast name()/version() on the Sepolia
// USDC 0x01C5...44E; docs/FACTS.md section 5.
export const USDC_PAYMENT_ASSET = {
  "celo-sepolia": { address: FX_TOKENS["celo-sepolia"].USDC, decimals: TOKEN_DECIMALS.USDC, name: "USDC", version: "2" },
  celo: { address: FX_TOKENS.celo.USDC, decimals: TOKEN_DECIMALS.USDC, name: "USDC", version: "2" },
} as const satisfies Record<KaribuNetwork, { address: string; decimals: number; name: string; version: string }>;

export type AgentConfig = {
  network: KaribuNetwork;
  port: number;
  agentAddress: string;
  agentId: string;
  demoWallets: ReadonlySet<string>;
  mockStream: boolean;
};

const envSchema = z.object({
  KARIBU_NETWORK: z.enum(["celo", "celo-sepolia"]).default("celo-sepolia"),
  PORT: z.coerce.number().int().positive().default(8787),
  AGENT_ADDRESS: z.string().default(""),
  KARIBU_AGENT_ID: z.string().default(""),
  KARIBU_DEMO_WALLETS: z.string().default(""),
  MOCK_STREAM: z.string().default(""),
});

export type ConfigResult = { ok: true; config: AgentConfig } | { ok: false; error: string };

// Errors as values: returns a discriminated result, never throws.
export function loadConfig(env: NodeJS.ProcessEnv): ConfigResult {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }
  const data = parsed.data;
  // Drew's demo wallets are excluded from the unique-client count for honesty.
  // sourceRef: KARIBU_BUILD_PLAN.md section 9.
  const demoWallets = new Set(
    data.KARIBU_DEMO_WALLETS.split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
  return {
    ok: true,
    config: {
      network: data.KARIBU_NETWORK,
      port: data.PORT,
      agentAddress: data.AGENT_ADDRESS,
      agentId: data.KARIBU_AGENT_ID,
      demoWallets,
      mockStream: data.MOCK_STREAM === "1",
    },
  };
}
