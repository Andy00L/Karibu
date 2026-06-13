// Public state contract for Karibu: shared types, zod schemas, and product
// constants. Every boundary (server emit, SSE frame, dashboard ingest) validates
// against these schemas. Types are derived from the schemas so the two can never
// drift. sourceRef: KARIBU_BUILD_PLAN.md section 2.4 (interface), 2.3 (caps),
// 2.1 (service prices).
import { z } from "zod";

// Network and service identifiers. sourceRef: plan section 2.4.
export const KARIBU_NETWORKS = ["celo", "celo-sepolia"] as const;
export const SERVICE_NAMES = ["verify", "fx-quote", "fx-swap", "notary"] as const;

export const karibuNetworkSchema = z.enum(KARIBU_NETWORKS);
export const serviceNameSchema = z.enum(SERVICE_NAMES);

export type KaribuNetwork = z.infer<typeof karibuNetworkSchema>;
export type ServiceName = z.infer<typeof serviceNameSchema>;

// The snapshot the dashboard renders. Every field is measured from chain reads
// or server counters, never hardcoded. sourceRef: plan section 2.4.
export const karibuSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  network: karibuNetworkSchema,
  agentId: z.string(),
  selfVerified: z.boolean(),
  txCountTotal: z.number().int().nonnegative(),
  txCount24h: z.number().int().nonnegative(),
  uniqueClientWallets: z.number().int().nonnegative(),
  revenueCusd: z.number().nonnegative(),
  gasPaidCusd: z.number().nonnegative(),
  feedbackCount: z.number().int().nonnegative(),
  scanScore: z.number().nullable(),
  updatedAtMs: z.number().int().nonnegative(),
});

export type KaribuSnapshot = z.infer<typeof karibuSnapshotSchema>;

// Live event feed. Every event with selfInitiated true renders with a distinct
// label and is counted separately from client-paid calls. sourceRef: plan 2.4.
export const karibuEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("service_paid"),
    service: serviceNameSchema,
    clientWallet: z.string(),
    amountUsd: z.number().nonnegative(),
    txHash: z.string(),
    selfInitiated: z.boolean(),
  }),
  z.object({
    type: z.literal("notary_anchored"),
    sha256: z.string(),
    txHash: z.string(),
    selfInitiated: z.boolean(),
  }),
  z.object({
    type: z.literal("fx_swapped"),
    fromSymbol: z.string(),
    toSymbol: z.string(),
    amountFrom: z.number().nonnegative(),
    txHash: z.string(),
  }),
  z.object({
    type: z.literal("human_verified"),
    walletShort: z.string(),
  }),
  z.object({
    type: z.literal("feedback_received"),
    clientWallet: z.string(),
    score: z.number(),
  }),
  z.object({
    type: z.literal("tick"),
    snapshot: karibuSnapshotSchema,
  }),
]);

export type KaribuEvent = z.infer<typeof karibuEventSchema>;

// Errors as values: parsing returns a discriminated result, never throws.
export type ParseResult<TValue> = { ok: true; value: TValue } | { ok: false; error: string };

export function parseKaribuEvent(input: unknown): ParseResult<KaribuEvent> {
  const result = karibuEventSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return { ok: false, error: result.error.message };
}

export function parseKaribuSnapshot(input: unknown): ParseResult<KaribuSnapshot> {
  const result = karibuSnapshotSchema.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  return { ok: false, error: result.error.message };
}

// Money caps in USD-equivalent (the Celo stable historically called cUSD, now
// branded USDm). sourceRef: KARIBU_BUILD_PLAN.md section 2.3.
export const ANONYMOUS_PER_CALL_CAP_CUSD = 0.25; // per-call FX payout cap, anonymous callers
export const ANONYMOUS_DAILY_CAP_CUSD = 1.0; // per-wallet daily cap, anonymous callers
export const VERIFIED_PER_CALL_CAP_CUSD = 5.0; // per-call cap, Self-verified callers
export const VERIFIED_DAILY_CAP_CUSD = 20.0; // per-wallet daily cap, Self-verified callers

// Replay protection window for notary and swap nonces. sourceRef: plan 2.3.
export const REPLAY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours, in milliseconds

// x402 service prices in USD. sourceRef: KARIBU_BUILD_PLAN.md section 2.1.
export const SERVICE_PRICE_USD: Record<ServiceName, number> = {
  verify: 0.01,
  "fx-quote": 0.01,
  "fx-swap": 0.05,
  notary: 0.02,
};

export type KaribuServiceDescriptor = {
  name: ServiceName;
  method: "GET" | "POST";
  path: string;
  priceUsd: number;
  description: string;
};

// The public service catalog, served at /api/skills for agent discovery and
// mirrored in the ERC-8004 registration. sourceRef: KARIBU_BUILD_PLAN.md 2.1.
export const SERVICE_CATALOG: readonly KaribuServiceDescriptor[] = [
  {
    name: "verify",
    method: "GET",
    path: "/api/verify/:wallet",
    priceUsd: SERVICE_PRICE_USD.verify,
    description: "Whether a verified human backs a wallet, via Self.",
  },
  {
    name: "fx-quote",
    method: "POST",
    path: "/api/fx/quote",
    priceUsd: SERVICE_PRICE_USD["fx-quote"],
    description: "A Mento FX quote between Celo stables.",
  },
  {
    name: "fx-swap",
    method: "POST",
    path: "/api/fx/swap",
    priceUsd: SERVICE_PRICE_USD["fx-swap"],
    description: "Execute a Mento FX swap, Self-gated above the anonymous cap.",
  },
  {
    name: "notary",
    method: "POST",
    path: "/api/notary",
    priceUsd: SERVICE_PRICE_USD.notary,
    description: "Anchor a sha256 hash on Celo and return a receipt.",
  },
];
