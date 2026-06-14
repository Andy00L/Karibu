import { test } from "node:test";
import assert from "node:assert/strict";
import { MetricsStore } from "./metrics.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("a paid call counts a transaction and a unique client", () => {
  const metrics = new MetricsStore("celo-sepolia", "1", new Set<string>());
  metrics.recordServicePaid("verify", "0xClientA", 1000);
  const snapshot = metrics.buildSnapshot(1000, 0, 0);
  assert.equal(snapshot.txCountTotal, 1);
  assert.equal(snapshot.uniqueClientWallets, 1);
});

test("demo wallets are excluded from the unique client count, case-insensitively", () => {
  const demoWallets = new Set(["0xdemo"]);
  const metrics = new MetricsStore("celo-sepolia", "1", demoWallets);
  metrics.recordServicePaid("verify", "0xDEMO", 1000);
  const snapshot = metrics.buildSnapshot(1000, 0, 0);
  assert.equal(snapshot.txCountTotal, 1);
  assert.equal(snapshot.uniqueClientWallets, 0);
});

test("a null-wallet paid call counts as a transaction but not a unique client", () => {
  const metrics = new MetricsStore("celo-sepolia", "1", new Set<string>());
  metrics.recordServicePaid("notary", null, 1000);
  const snapshot = metrics.buildSnapshot(1000, 0, 0);
  assert.equal(snapshot.txCountTotal, 1);
  assert.equal(snapshot.uniqueClientWallets, 0);
});

test("txCount24h excludes activity older than 24 hours", () => {
  const metrics = new MetricsStore("celo-sepolia", "1", new Set<string>());
  metrics.recordServicePaid("verify", "0xa", 0);
  metrics.recordServicePaid("verify", "0xb", DAY_MS + 1000);
  const snapshot = metrics.buildSnapshot(DAY_MS + 1000, 0, 0);
  assert.equal(snapshot.txCountTotal, 2);
  assert.equal(snapshot.txCount24h, 1);
});

test("self-initiated activity counts as a transaction but not a unique client", () => {
  const metrics = new MetricsStore("celo-sepolia", "1", new Set<string>());
  metrics.recordSelfInitiated("notary", 1000);
  const snapshot = metrics.buildSnapshot(1000, 0, 0);
  assert.equal(snapshot.txCountTotal, 1);
  assert.equal(snapshot.uniqueClientWallets, 0);
});
