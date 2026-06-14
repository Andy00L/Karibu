import Fastify, { type FastifyInstance } from "fastify";
import type { KaribuEvent, KaribuSnapshot } from "@karibu/state-contract";
import { SERVICE_PRICE_USD, SERVICE_CATALOG } from "@karibu/state-contract";
import { NETWORK_CONFIG, type AgentConfig } from "./config.js";
import type { MetricsStore } from "./metrics.js";
import type { EventBus } from "./events.js";
import type { SpendTracker } from "./spend-tracker.js";
import { gatePayment, type PaymentContext } from "./payment.js";
import {
  anchorSha256,
  notaryRequestSchema,
  readNotaryReceipt,
  receiptParamsSchema,
  type NotaryRuntime,
} from "./notary.js";
import { quoteFx, fxQuoteRequestSchema, type FxRuntime } from "./fx.js";
import { executeSwap, fxSwapRequestSchema, type SwapRuntime } from "./swap.js";
import { type SelfVerifier, verifyParamsSchema } from "./self.js";
import type { ReplayGuard } from "./replay-guard.js";
import type { PayoutPolicy } from "./payout-policy.js";
import type { RateLimiter } from "./rate-limiter.js";
import { logInfo } from "./logger.js";

export type ServerDependencies = {
  config: AgentConfig;
  metrics: MetricsStore;
  events: EventBus;
  spendTracker: SpendTracker;
  payment: PaymentContext | null;
  notaryRuntime: NotaryRuntime | null;
  fxRuntime: FxRuntime | null;
  swapRuntime: SwapRuntime | null;
  selfVerifier: SelfVerifier;
  replayGuard: ReplayGuard;
  payoutPolicy: PayoutPolicy;
  rateLimiter: RateLimiter;
  startedAtMs: number;
  now: () => number;
};

// Builds the snapshot from activity metrics plus the SpendTracker money figures,
// so revenue and gas have a single source of truth.
function currentSnapshot(deps: ServerDependencies): KaribuSnapshot {
  const spend = deps.spendTracker.status();
  return deps.metrics.buildSnapshot(deps.now(), spend.revenueCusd, spend.spentCusd);
}

function readPaymentHeader(headerValue: string | string[] | undefined): string | null {
  return typeof headerValue === "string" ? headerValue : null;
}

export function buildServer(deps: ServerDependencies): FastifyInstance {
  const app = Fastify({ logger: false });

  // Per-IP rate limit on every route except the health check, so uptime pings
  // are never throttled. sourceRef: KARIBU_BUILD_PLAN.md Day 3 hardening.
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health") {
      return;
    }
    if (!deps.rateLimiter.check(request.ip, deps.now())) {
      reply.code(429).send({ error: "rate limit exceeded" });
    }
  });

  app.get("/health", async () => {
    return {
      ok: true,
      network: deps.config.network,
      agentId: deps.config.agentId,
      x402: deps.payment !== null,
      notary: deps.notaryRuntime !== null,
      fx: deps.fxRuntime !== null,
      fxSwap: deps.swapRuntime !== null,
      mockStream: deps.config.mockStream,
      uptimeMs: deps.now() - deps.startedAtMs,
    };
  });

  app.get("/api/metrics", async () => {
    return currentSnapshot(deps);
  });

  app.get("/api/treasury", async () => {
    return deps.spendTracker.status();
  });

  // Public receipt verifier: render any notary receipt by hash. Free and
  // read-only. sourceRef: KARIBU_BUILD_PLAN.md section 2.5.
  app.get("/verify-receipt/:hash", async (request, reply) => {
    if (deps.notaryRuntime === null) {
      return reply.code(503).send({ error: "receipt lookup unavailable: chain runtime not configured" });
    }
    const parsedParams = receiptParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: parsedParams.error.message });
    }
    const receipt = await readNotaryReceipt(deps.notaryRuntime, parsedParams.data.hash);
    if (!receipt.ok) {
      return reply.code(400).send({ error: receipt.reason });
    }
    return receipt;
  });

  // SVC-6 discovery: the public service catalog any agent can read for free to
  // learn what Karibu sells and how to pay. sourceRef: KARIBU_BUILD_PLAN.md 2.1.
  app.get("/api/skills", async () => {
    return {
      agentId: deps.config.agentId,
      network: deps.config.network,
      services: SERVICE_CATALOG,
      payment: {
        protocol: "x402",
        client: "wrapFetchWithPayment(fetch, client, wallet, { maxValue })",
      },
    };
  });

  // ERC-8004 domain verification: serving this file with the registry address
  // and agentId marks the endpoint verified in explorers. sourceRef:
  // docs/FACTS.md section 3 and KARIBU_BUILD_PLAN.md 2.2.
  app.get("/.well-known/agent-registration.json", async () => {
    const networkConfig = NETWORK_CONFIG[deps.config.network];
    return {
      agentRegistry: networkConfig.identityRegistry,
      agentId: deps.config.agentId,
      chainId: networkConfig.chainId,
    };
  });

  // A2A agent card: how another agent discovers Karibu and its skills.
  // sourceRef: KARIBU_BUILD_PLAN.md 2.2.
  app.get("/.well-known/agent-card.json", async (request) => {
    const hostHeader = typeof request.headers.host === "string" ? request.headers.host : "localhost";
    const baseUrl = `${request.protocol}://${hostHeader}`;
    const networkConfig = NETWORK_CONFIG[deps.config.network];
    return {
      protocolVersion: "0.2.0",
      name: "Karibu",
      description:
        "Gateway agent on Celo: proof-of-personhood via Self, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services.",
      url: baseUrl,
      version: "0.1.0",
      capabilities: { streaming: true },
      defaultInputModes: ["application/json"],
      defaultOutputModes: ["application/json"],
      provider: { organization: "Karibu", url: baseUrl },
      registrations: [
        {
          agentRegistry: networkConfig.identityRegistry,
          agentId: deps.config.agentId,
          chainId: networkConfig.chainId,
        },
      ],
      skills: SERVICE_CATALOG.map((service) => ({
        id: service.name,
        name: service.name,
        description: service.description,
        tags: ["celo", "x402", "payments"],
      })),
    };
  });

  // SVC-4 notary, gated by x402. Unpaid returns the 402 challenge; paid anchors
  // the hash on-chain. sourceRef: KARIBU_BUILD_PLAN.md sections 2.1 and 6.
  app.post("/api/notary", async (request, reply) => {
    if (deps.payment === null || deps.notaryRuntime === null) {
      return reply.code(503).send({ error: "notary unavailable: x402 or chain runtime not configured" });
    }
    const hostHeader = typeof request.headers.host === "string" ? request.headers.host : "localhost";
    const resourceUrl = `${request.protocol}://${hostHeader}${request.url}`;
    const paymentData = readPaymentHeader(request.headers["x-payment"] ?? request.headers["payment-signature"]);

    const gate = await gatePayment(deps.payment, "notary", resourceUrl, "POST", paymentData);
    if (!gate.paid) {
      reply.code(gate.status);
      for (const [headerKey, headerValue] of Object.entries(gate.headers)) {
        reply.header(headerKey, headerValue);
      }
      return gate.body;
    }

    const parsed = notaryRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }
    if (parsed.data.nonce !== undefined) {
      const isFreshNonce = deps.replayGuard.checkAndRecord(parsed.data.nonce, deps.now());
      if (!isFreshNonce) {
        return reply.code(409).send({ error: "duplicate request nonce within the replay window" });
      }
    }
    const anchorResult = await anchorSha256(deps.notaryRuntime, parsed.data.sha256);
    if (!anchorResult.ok) {
      return reply.code(502).send({ error: anchorResult.reason });
    }

    for (const [headerKey, headerValue] of Object.entries(gate.receiptHeaders)) {
      reply.header(headerKey, headerValue);
    }
    const nowMs = deps.now();
    deps.spendTracker.recordRevenue(SERVICE_PRICE_USD.notary);
    deps.metrics.recordServicePaid("notary", null, nowMs);
    deps.events.emit({
      type: "notary_anchored",
      sha256: anchorResult.sha256,
      txHash: anchorResult.txHash,
      selfInitiated: false,
    });
    return {
      sha256: anchorResult.sha256,
      txHash: anchorResult.txHash,
      explorerUrl: anchorResult.explorerUrl,
      receiptUrl: `/verify-receipt/${anchorResult.sha256}`,
    };
  });

  // SVC-2 fx-quote, gated by x402. Returns a Mento quote, or a distinct error
  // when the FX market is closed, the route is missing, or the feed is stale.
  // sourceRef: KARIBU_BUILD_PLAN.md section 2.1 (SVC-2).
  app.post("/api/fx/quote", async (request, reply) => {
    if (deps.payment === null || deps.fxRuntime === null) {
      return reply.code(503).send({ error: "fx-quote unavailable: x402 or Mento runtime not configured" });
    }
    const hostHeader = typeof request.headers.host === "string" ? request.headers.host : "localhost";
    const resourceUrl = `${request.protocol}://${hostHeader}${request.url}`;
    const paymentData = readPaymentHeader(request.headers["x-payment"] ?? request.headers["payment-signature"]);

    const gate = await gatePayment(deps.payment, "fx-quote", resourceUrl, "POST", paymentData);
    if (!gate.paid) {
      reply.code(gate.status);
      for (const [headerKey, headerValue] of Object.entries(gate.headers)) {
        reply.header(headerKey, headerValue);
      }
      return gate.body;
    }

    const parsed = fxQuoteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }
    const quoteResult = await quoteFx(deps.fxRuntime, parsed.data.from, parsed.data.to, parsed.data.amount);
    if (!quoteResult.ok) {
      return reply.code(409).send({ error: quoteResult.reason });
    }

    for (const [headerKey, headerValue] of Object.entries(gate.receiptHeaders)) {
      reply.header(headerKey, headerValue);
    }
    const nowMs = deps.now();
    deps.spendTracker.recordRevenue(SERVICE_PRICE_USD["fx-quote"]);
    deps.metrics.recordServicePaid("fx-quote", null, nowMs);
    return quoteResult.quote;
  });

  // SVC-3 fx-swap, gated by x402. Executes a Mento swap from the treasury and
  // pays the output to the caller. Self-gated: the payout caps from section 2.3
  // apply, higher for Self-verified callers. A client nonce guards replay.
  // sourceRef: KARIBU_BUILD_PLAN.md section 2.1 (SVC-3) and 2.3 (caps).
  app.post("/api/fx/swap", async (request, reply) => {
    if (deps.payment === null || deps.swapRuntime === null) {
      return reply.code(503).send({ error: "fx-swap unavailable: x402 or swap runtime not configured" });
    }
    const hostHeader = typeof request.headers.host === "string" ? request.headers.host : "localhost";
    const resourceUrl = `${request.protocol}://${hostHeader}${request.url}`;
    const paymentData = readPaymentHeader(request.headers["x-payment"] ?? request.headers["payment-signature"]);

    const gate = await gatePayment(deps.payment, "fx-swap", resourceUrl, "POST", paymentData);
    if (!gate.paid) {
      reply.code(gate.status);
      for (const [headerKey, headerValue] of Object.entries(gate.headers)) {
        reply.header(headerKey, headerValue);
      }
      return gate.body;
    }

    const parsed = fxSwapRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }
    const swapRequest = parsed.data;
    if (swapRequest.nonce !== undefined) {
      const isFreshNonce = deps.replayGuard.checkAndRecord(swapRequest.nonce, deps.now());
      if (!isFreshNonce) {
        return reply.code(409).send({ error: "duplicate request nonce within the replay window" });
      }
    }
    const amountNumber = Number(swapRequest.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return reply.code(400).send({ error: "amount must be a positive number" });
    }

    // Self gating: a verified human backing the recipient lifts the payout caps.
    const verification = await deps.selfVerifier.isHumanBacked(swapRequest.recipient);
    const payoutDecision = deps.payoutPolicy.evaluate(
      swapRequest.recipient,
      amountNumber,
      verification.humanBacked,
      deps.now(),
    );
    if (!payoutDecision.ok) {
      return reply.code(403).send({ error: payoutDecision.reason });
    }

    const swapResult = await executeSwap(
      deps.swapRuntime,
      swapRequest.from,
      swapRequest.to,
      swapRequest.amount,
      swapRequest.recipient,
    );
    if (!swapResult.ok) {
      return reply.code(502).send({ error: swapResult.reason });
    }

    for (const [headerKey, headerValue] of Object.entries(gate.receiptHeaders)) {
      reply.header(headerKey, headerValue);
    }
    const nowMs = deps.now();
    deps.payoutPolicy.record(swapRequest.recipient, amountNumber, nowMs);
    deps.spendTracker.recordRevenue(SERVICE_PRICE_USD["fx-swap"]);
    deps.metrics.recordServicePaid("fx-swap", swapRequest.recipient, nowMs);
    deps.events.emit({
      type: "fx_swapped",
      fromSymbol: swapResult.execution.fromSymbol,
      toSymbol: swapResult.execution.toSymbol,
      amountFrom: amountNumber,
      txHash: swapResult.execution.txHash,
    });
    return swapResult.execution;
  });

  // SVC-1 verify, gated by x402. Returns whether a verified human backs a wallet
  // via Self. sourceRef: KARIBU_BUILD_PLAN.md section 2.1 (SVC-1).
  app.get("/api/verify/:wallet", async (request, reply) => {
    if (deps.payment === null) {
      return reply.code(503).send({ error: "verify unavailable: x402 not configured" });
    }
    const parsedParams = verifyParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: parsedParams.error.message });
    }
    const hostHeader = typeof request.headers.host === "string" ? request.headers.host : "localhost";
    const resourceUrl = `${request.protocol}://${hostHeader}${request.url}`;
    const paymentData = readPaymentHeader(request.headers["x-payment"] ?? request.headers["payment-signature"]);

    const gate = await gatePayment(deps.payment, "verify", resourceUrl, "GET", paymentData);
    if (!gate.paid) {
      reply.code(gate.status);
      for (const [headerKey, headerValue] of Object.entries(gate.headers)) {
        reply.header(headerKey, headerValue);
      }
      return gate.body;
    }

    const result = await deps.selfVerifier.isHumanBacked(parsedParams.data.wallet);
    for (const [headerKey, headerValue] of Object.entries(gate.receiptHeaders)) {
      reply.header(headerKey, headerValue);
    }
    deps.spendTracker.recordRevenue(SERVICE_PRICE_USD.verify);
    deps.metrics.recordServicePaid("verify", null, deps.now());
    if (result.humanBacked) {
      deps.events.emit({
        type: "human_verified",
        walletShort: `${result.wallet.slice(0, 6)}...${result.wallet.slice(-4)}`,
      });
    }
    return result;
  });

  // Server-Sent Events stream. Fastify hands the raw socket to us via hijack();
  // we own writing and cleanup from here. sourceRef: KARIBU_BUILD_PLAN.md 2.5.
  app.get("/api/stream", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const writeEvent = (event: KaribuEvent): void => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    // Send an initial tick so a fresh client renders immediately.
    writeEvent({ type: "tick", snapshot: currentSnapshot(deps) });
    const unsubscribe = deps.events.subscribe(writeEvent);
    request.raw.on("close", () => {
      unsubscribe();
    });
  });

  logInfo("buildServer", "routes registered", { routeCount: 12 });
  return app;
}
