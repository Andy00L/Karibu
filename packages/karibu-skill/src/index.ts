import { z } from "zod";
import { wrapFetchWithPayment } from "thirdweb/x402";
import type { ThirdwebClient } from "thirdweb";
import type { Wallet } from "thirdweb/wallets";

// The shape Karibu serves at GET /api/skills. Validated at runtime so a caller
// never trusts an unverified manifest. sourceRef: KARIBU_BUILD_PLAN.md 2.1.
export const karibuServiceSchema = z.object({
  name: z.string(),
  method: z.enum(["GET", "POST"]),
  path: z.string(),
  priceUsd: z.number(),
  description: z.string(),
});

export const karibuManifestSchema = z.object({
  agentId: z.string(),
  network: z.string(),
  services: z.array(karibuServiceSchema),
  payment: z.object({ protocol: z.string(), client: z.string() }),
});

export type KaribuManifest = z.infer<typeof karibuManifestSchema>;

// Errors as values: every method returns a discriminated result, never throws.
export type KaribuResult<TValue> = { ok: true; value: TValue } | { ok: false; error: string };

export type KaribuClientOptions = {
  baseUrl: string;
  client: ThirdwebClient;
  wallet: Wallet;
  maxValueWei?: bigint;
};

export type KaribuClient = {
  discover: () => Promise<KaribuResult<KaribuManifest>>;
  verify: (walletAddress: string) => Promise<KaribuResult<unknown>>;
  fxQuote: (fromSymbol: string, toSymbol: string, amount: string) => Promise<KaribuResult<unknown>>;
  notary: (sha256: string) => Promise<KaribuResult<unknown>>;
};

function trimTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function readJson(response: Response): Promise<KaribuResult<unknown>> {
  const bodyText = await response.text();
  let parsed: unknown = bodyText;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = bodyText;
  }
  if (!response.ok) {
    const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    return { ok: false, error: `HTTP ${response.status}: ${detail}` };
  }
  return { ok: true, value: parsed };
}

// Builds a client that discovers Karibu's catalog (free) and pays its x402
// services. The payment flow is handled by thirdweb's wrapFetchWithPayment: a
// 402 response is answered with a signed payment and the request is retried.
export function createKaribuClient(options: KaribuClientOptions): KaribuClient {
  const base = trimTrailingSlash(options.baseUrl);
  const paymentOptions = options.maxValueWei !== undefined ? { maxValue: options.maxValueWei } : {};
  const fetchWithPayment = wrapFetchWithPayment(fetch, options.client, options.wallet, paymentOptions);

  return {
    async discover(): Promise<KaribuResult<KaribuManifest>> {
      const response = await fetch(`${base}/api/skills`);
      const json = await readJson(response);
      if (!json.ok) {
        return json;
      }
      const parsed = karibuManifestSchema.safeParse(json.value);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.message };
      }
      return { ok: true, value: parsed.data };
    },
    async verify(walletAddress: string): Promise<KaribuResult<unknown>> {
      const response = await fetchWithPayment(`${base}/api/verify/${walletAddress}`);
      return readJson(response);
    },
    async fxQuote(fromSymbol: string, toSymbol: string, amount: string): Promise<KaribuResult<unknown>> {
      const response = await fetchWithPayment(`${base}/api/fx/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromSymbol, to: toSymbol, amount }),
      });
      return readJson(response);
    },
    async notary(sha256: string): Promise<KaribuResult<unknown>> {
      const response = await fetchWithPayment(`${base}/api/notary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha256 }),
      });
      return readJson(response);
    },
  };
}
