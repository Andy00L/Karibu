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

test("in-flight reservations count against the daily cap until released", () => {
  const policy = new PayoutPolicy();
  // Verified per-call cap is 5 and daily cap is 20: four concurrent 5s reserve
  // exactly 20. A fifth would reach 25 and must be rejected while none has settled
  // yet (the check-then-act race the reservation closes).
  assert.equal(policy.reserve("0xr", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xr", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xr", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xr", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xr", 5, true, 0).ok, false);
  // Releasing one in-flight 5 frees room for exactly one more.
  policy.release("0xr", 5);
  assert.equal(policy.reserve("0xr", 5, true, 0).ok, true);
});

test("commit settles a reservation into the daily total", () => {
  const policy = new PayoutPolicy();
  assert.equal(policy.reserve("0xc", 5, true, 0).ok, true);
  policy.commit("0xc", 5, 0);
  // The 5 is now settled. Three more 5s reach 20; a fourth is over the daily cap.
  assert.equal(policy.reserve("0xc", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xc", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xc", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xc", 5, true, 0).ok, false);
});

test("release never drives the reserved total negative", () => {
  const policy = new PayoutPolicy();
  // A spurious release with no prior reservation must floor at zero, not create
  // negative headroom a later payout could borrow against.
  policy.release("0xz", 5);
  assert.equal(policy.reserve("0xz", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xz", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xz", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xz", 5, true, 0).ok, true);
  assert.equal(policy.reserve("0xz", 5, true, 0).ok, false);
});
