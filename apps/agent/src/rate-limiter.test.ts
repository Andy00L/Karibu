import { test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "./rate-limiter.js";

test("allows requests under the limit", () => {
  const limiter = new RateLimiter(2, 1000);
  assert.equal(limiter.check("client-a", 0), true);
  assert.equal(limiter.check("client-a", 100), true);
});

test("blocks requests over the limit within the window", () => {
  const limiter = new RateLimiter(2, 1000);
  limiter.check("client-a", 0);
  limiter.check("client-a", 100);
  assert.equal(limiter.check("client-a", 200), false);
});

test("resets after the window elapses", () => {
  const limiter = new RateLimiter(1, 1000);
  limiter.check("client-a", 0);
  assert.equal(limiter.check("client-a", 1001), true);
});

test("tracks distinct keys independently", () => {
  const limiter = new RateLimiter(1, 1000);
  limiter.check("client-a", 0);
  assert.equal(limiter.check("client-b", 0), true);
});
