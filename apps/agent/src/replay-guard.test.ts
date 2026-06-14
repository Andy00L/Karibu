import { test } from "node:test";
import assert from "node:assert/strict";
import { ReplayGuard } from "./replay-guard.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("a fresh nonce is accepted", () => {
  const guard = new ReplayGuard();
  assert.equal(guard.checkAndRecord("nonce-a", 1000), true);
});

test("a duplicate nonce within the window is rejected", () => {
  const guard = new ReplayGuard();
  guard.checkAndRecord("nonce-a", 1000);
  assert.equal(guard.checkAndRecord("nonce-a", 2000), false);
});

test("the same nonce is accepted again after the window expires", () => {
  const guard = new ReplayGuard();
  guard.checkAndRecord("nonce-a", 1000);
  assert.equal(guard.checkAndRecord("nonce-a", 1000 + DAY_MS + 1), true);
});

test("distinct nonces are tracked independently", () => {
  const guard = new ReplayGuard();
  guard.checkAndRecord("nonce-a", 1000);
  assert.equal(guard.checkAndRecord("nonce-b", 1000), true);
});
