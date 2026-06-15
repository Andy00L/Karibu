import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMcpServerCard, handleMcpRequest } from "./mcp.js";

const BASE = "https://karibu-celo.onrender.com";

test("the MCP server card lists the endpoint, tools, and the erc8004 link", () => {
  const card = JSON.stringify(buildMcpServerCard(BASE + "/"));
  assert.match(card, /"endpoint":"https:\/\/karibu-celo\.onrender\.com\/mcp"/);
  assert.match(card, /"discover"/);
  assert.match(card, /"notary"/);
  assert.match(card, /"agent_id":9373/);
});

test("initialize returns the protocol version and server info", () => {
  const response = JSON.stringify(handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "initialize" }, BASE));
  assert.match(response, /"protocolVersion":"2025-06-18"/);
  assert.match(response, /"name":"karibu"/);
});

test("tools/list returns all five tools", () => {
  const response = handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }, BASE);
  const serialized = JSON.stringify(response);
  assert.match(serialized, /"tools":\[/);
  const toolNameCount = (serialized.match(/"name":/g) ?? []).length;
  assert.equal(toolNameCount, 5);
});

test("tools/call discover returns the catalog with absolute endpoints", () => {
  const response = JSON.stringify(
    handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "discover" } }, BASE),
  );
  assert.match(response, /karibu-celo\.onrender\.com\/api\/notary/);
});

test("tools/call on a paid tool points at its x402 endpoint and price", () => {
  const response = JSON.stringify(
    handleMcpRequest({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "notary" } }, BASE),
  );
  assert.match(response, /\/api\/notary/);
  assert.match(response, /0\.02 USDC/);
});

test("an unknown method returns method-not-found (-32601)", () => {
  const response = JSON.stringify(handleMcpRequest({ jsonrpc: "2.0", id: 5, method: "does/not/exist" }, BASE));
  assert.match(response, /-32601/);
});

test("a notification with no id gets no response", () => {
  assert.equal(handleMcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" }, BASE), null);
});

test("a malformed request that still carries an id returns invalid-request (-32600)", () => {
  const response = JSON.stringify(handleMcpRequest({ id: 9, method: 123 }, BASE));
  assert.match(response, /-32600/);
});

test("an unknown tool returns invalid-params (-32602)", () => {
  const response = JSON.stringify(
    handleMcpRequest({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "ghost" } }, BASE),
  );
  assert.match(response, /-32602/);
});
