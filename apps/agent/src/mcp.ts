import { z } from "zod";
import { SERVICE_CATALOG, SERVICE_PRICE_USD } from "@karibu/state-contract";

// The MCP protocol revision Karibu speaks, matching the served server card.
// sourceRef: https://modelcontextprotocol.io, 8004scan agent 1870 mcp.json.
const MCP_PROTOCOL_VERSION = "2025-06-18"; // MCP spec revision date

// The four x402-paid services plus a free discovery tool, exposed over MCP. The
// inputSchema of each mirrors the matching HTTP endpoint's request body so an
// MCP client knows exactly what to send. Paid tools are not settled over MCP;
// tools/call returns the x402 HTTP endpoint and price, and payment happens there.
// sourceRef: packages/state-contract SERVICE_CATALOG, apps/agent/src/server.ts.
type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  servicePath: string | null; // null for the free discovery tool
  priceUsd: number | null;
};

const MCP_TOOLS: readonly McpTool[] = [
  {
    name: "discover",
    description: "List Karibu's services, prices, and how to pay over x402. Free, read only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    servicePath: null,
    priceUsd: null,
  },
  {
    name: "verify",
    description: "Whether a verified human backs a wallet, via Self. Paid over x402.",
    inputSchema: {
      type: "object",
      properties: { wallet: { type: "string", description: "the wallet address to check" } },
      required: ["wallet"],
      additionalProperties: false,
    },
    servicePath: "/api/verify/:wallet",
    priceUsd: SERVICE_PRICE_USD.verify,
  },
  {
    name: "fx_quote",
    description: "A Mento FX quote between Celo stables. Paid over x402.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "source stable symbol, e.g. cUSD" },
        to: { type: "string", description: "target stable symbol, e.g. cKES" },
        amount: { type: "string", description: "decimal amount of the source token" },
      },
      required: ["from", "to", "amount"],
      additionalProperties: false,
    },
    servicePath: "/api/fx/quote",
    priceUsd: SERVICE_PRICE_USD["fx-quote"],
  },
  {
    name: "fx_swap",
    description: "Convert prepaid USDC to a Celo stable, paid out to you. Paid over x402.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "target stable symbol" },
        amount: { type: "string", description: "USDC amount to convert" },
        recipient: { type: "string", description: "address to receive the output" },
        nonce: { type: "string", description: "unique per-request replay key" },
      },
      required: ["to", "amount", "recipient", "nonce"],
      additionalProperties: false,
    },
    servicePath: "/api/fx/swap",
    priceUsd: SERVICE_PRICE_USD["fx-swap"],
  },
  {
    name: "notary",
    description: "Anchor a sha256 hash on Celo and return a receipt. Paid over x402.",
    inputSchema: {
      type: "object",
      properties: { sha256: { type: "string", description: "32 byte sha256 hex, optionally 0x prefixed" } },
      required: ["sha256"],
      additionalProperties: false,
    },
    servicePath: "/api/notary",
    priceUsd: SERVICE_PRICE_USD.notary,
  },
];

// The static MCP server card served at /.well-known/mcp.json. Explorers read it to
// detect the MCP endpoint and its tools; the erc8004 block ties the card to the
// on-chain agent. sourceRef: the mcp-server-card v1 schema; 8004scan agent 1870.
export function buildMcpServerCard(baseUrl: string): Record<string, unknown> {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return {
    $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
    schema_version: MCP_PROTOCOL_VERSION,
    version: "0.1.0",
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverInfo: { name: "karibu", title: "Karibu", version: "0.1.0" },
    description:
      "Gateway agent on Celo: Self human-verification, Mento FX between Celo stables, and on-chain notary receipts, sold as x402-paid services.",
    endpoint: `${normalizedBase}/mcp`,
    transport: { type: "streamable-http", endpoint: "/mcp" },
    capabilities: { tools: {} },
    tools: MCP_TOOLS.map((tool) => tool.name),
    // sourceRef: apps/agent/src/config.ts (mainnet chainId 42220, identityRegistry).
    erc8004: { agent_id: 9373, chain: "celo", chain_id: 42220, registry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" },
  };
}

// JSON-RPC 2.0 envelope. id is absent on notifications; present (string or number)
// on requests. Parsed with zod so a malformed body never throws here.
const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).nullable().optional(),
  method: z.string(),
  params: z.unknown().optional(),
});

const toolCallParamsSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

type JsonRpcResponse = Record<string, unknown>;

function jsonRpcResult(id: string | number | null, result: Record<string, unknown>): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// Handles one MCP JSON-RPC message. Returns the response object, or null for a
// notification (no id), which the transport answers with an empty 202. Errors as
// values: a malformed message yields a JSON-RPC error response, never a throw.
export function handleMcpRequest(body: unknown, baseUrl: string): JsonRpcResponse | null {
  const parsed = jsonRpcRequestSchema.safeParse(body);
  if (!parsed.success) {
    // A notification (no id) that fails to parse gets no response; otherwise -32600.
    const hasId =
      typeof body === "object" && body !== null && "id" in body && (body as { id?: unknown }).id !== undefined;
    return hasId ? jsonRpcError(extractId(body), -32600, "Invalid Request") : null;
  }
  const request = parsed.data;
  const id = request.id ?? null;
  const isNotification = request.id === undefined;

  if (request.method.startsWith("notifications/")) {
    return null; // notifications never get a response
  }
  if (isNotification) {
    return null;
  }
  if (request.method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: "karibu", title: "Karibu", version: "0.1.0" },
    });
  }
  if (request.method === "ping") {
    return jsonRpcResult(id, {});
  }
  if (request.method === "tools/list") {
    return jsonRpcResult(id, {
      tools: MCP_TOOLS.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })),
    });
  }
  if (request.method === "tools/call") {
    return handleToolCall(id, request.params, baseUrl);
  }
  return jsonRpcError(id, -32601, `Method not found: ${request.method}`);
}

function handleToolCall(id: string | number | null, params: unknown, baseUrl: string): JsonRpcResponse {
  const parsedParams = toolCallParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    return jsonRpcError(id, -32602, "Invalid params: expected { name }");
  }
  const tool = MCP_TOOLS.find((candidate) => candidate.name === parsedParams.data.name);
  if (tool === undefined) {
    return jsonRpcError(id, -32602, `Unknown tool: ${parsedParams.data.name}`);
  }
  const normalizedBase = baseUrl.replace(/\/$/, "");
  if (tool.servicePath === null) {
    // discover: return the live catalog with absolute endpoints and prices.
    const catalog = SERVICE_CATALOG.map((service) => ({
      name: service.name,
      method: service.method,
      endpoint: `${normalizedBase}${service.path}`,
      priceUsd: service.priceUsd,
      description: service.description,
    }));
    return jsonRpcResult(id, { content: [{ type: "text", text: JSON.stringify(catalog, null, 2) }] });
  }
  // Paid tools settle over x402 on the HTTP endpoint, not over MCP. Return the
  // exact endpoint and price so the caller can pay there. Honest by construction:
  // MCP does the discovery, the x402 HTTP route does the paid execution.
  const guidance =
    `${tool.name} is an x402-paid service. Call ${normalizedBase}${tool.servicePath} ` +
    `with an x402 payment of ${tool.priceUsd} USDC. Free discovery and the pay flow are at ${normalizedBase}/api/skills.`;
  return jsonRpcResult(id, { content: [{ type: "text", text: guidance }] });
}

function extractId(body: unknown): string | number | null {
  if (typeof body === "object" && body !== null && "id" in body) {
    const candidate = (body as { id?: unknown }).id;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
  }
  return null;
}
