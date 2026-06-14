import { test } from "node:test";
import assert from "node:assert/strict";
import { SpendTracker } from "./spend-tracker.js";

test("availableCusd is the grant plus revenue", () => {
  const tracker = new SpendTracker(1);
  tracker.recordRevenue(0.5);
  assert.equal(tracker.availableCusd(), 1.5);
});

test("canSpend refuses a spend above available funds", () => {
  const tracker = new SpendTracker(1);
  const decision = tracker.canSpend(2);
  assert.equal(decision.ok, false);
});

test("canSpend refuses at the 80 percent stop threshold", () => {
  const tracker = new SpendTracker(1);
  const decision = tracker.canSpend(0.8);
  assert.equal(decision.ok, false);
});

test("canSpend allows a spend below the threshold", () => {
  const tracker = new SpendTracker(1);
  const decision = tracker.canSpend(0.5);
  assert.equal(decision.ok, true);
});

test("status netCusd is revenue minus spent", () => {
  const tracker = new SpendTracker(0);
  tracker.recordRevenue(1);
  tracker.recordSpend(0.3);
  const status = tracker.status();
  assert.equal(Number(status.netCusd.toFixed(2)), 0.7);
});
