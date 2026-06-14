import { test } from "node:test";
import assert from "node:assert/strict";
import { PayoutPolicy } from "./payout-policy.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("the anonymous per-call cap rejects an over-cap payout", () => {
  const policy = new PayoutPolicy();
  assert.equal(policy.evaluate("0xa", 0.3, false, 0).ok, false);
  assert.equal(policy.evaluate("0xa", 0.2, false, 0).ok, true);
});

test("the verified per-call cap is higher than anonymous", () => {
  const policy = new PayoutPolicy();
  assert.equal(policy.evaluate("0xa", 6, true, 0).ok, false);
  assert.equal(policy.evaluate("0xa", 4, true, 0).ok, true);
});

test("the per-wallet daily cap is enforced across payouts", () => {
  const policy = new PayoutPolicy();
  // Verified per-call cap is 5 and daily cap is 20. Spend 15 in three payouts;
  // the next 5 reaches exactly 20 (allowed); a further 5 exceeds the daily cap.
  policy.record("0xv", 5, 0);
  policy.record("0xv", 5, 0);
  policy.record("0xv", 5, 0);
  assert.equal(policy.evaluate("0xv", 5, true, 0).ok, true);
  policy.record("0xv", 5, 0);
  assert.equal(policy.evaluate("0xv", 5, true, 0).ok, false);
});

test("the daily total resets after 24 hours", () => {
  const policy = new PayoutPolicy();
  policy.record("0xa", 0.2, 0);
  assert.equal(policy.evaluate("0xa", 0.2, false, DAY_MS + 1).ok, true);
});

test("a non-positive payout is rejected", () => {
  const policy = new PayoutPolicy();
  assert.equal(policy.evaluate("0xa", 0, false, 0).ok, false);
});

test("daily totals are tracked case-insensitively per wallet", () => {
  const policy = new PayoutPolicy();
  // Record 18 for the wallet in upper case; a 5 payout for the same wallet in
  // lower case would reach 23, over the 20 verified daily cap.
  policy.record("0xABC", 5, 0);
  policy.record("0xABC", 5, 0);
  policy.record("0xABC", 5, 0);
  policy.record("0xABC", 3, 0);
  assert.equal(policy.evaluate("0xabc", 5, true, 0).ok, false);
});
