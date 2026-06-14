import { test } from "node:test";
import assert from "node:assert/strict";
import { toTokenUnits, readTransferAmount, fxSwapRequestSchema } from "./swap.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const USDM = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";
const RECIPIENT = "0x1147856217691a72C96F36F04697Abfb7305eF9f";

function topicForAddress(address: string): string {
  return `0x000000000000000000000000${address.toLowerCase().slice(2)}`;
}

test("toTokenUnits scales by the token's own decimals", () => {
  assert.equal(toTokenUnits("0.2", 6), 200000n); // 0.2 USDC at 6 decimals
  assert.equal(toTokenUnits("1", 18), 1000000000000000000n); // 1 stable at 18 decimals
  assert.equal(toTokenUnits("1.5", 18), 1500000000000000000n);
  assert.equal(toTokenUnits("0", 6), 0n);
});

test("toTokenUnits rejects malformed or over-precise amounts", () => {
  assert.equal(toTokenUnits("abc", 6), null);
  assert.equal(toTokenUnits("", 6), null);
  assert.equal(toTokenUnits("-1", 6), null);
  assert.equal(toTokenUnits("0.1234567", 6), null); // 7 fraction digits exceeds USDC's 6
  assert.equal(toTokenUnits("1.23", 2), 123n);
});

test("readTransferAmount reads the exact output transferred to the recipient", () => {
  const otherTopic = "0x0000000000000000000000000000000000000000000000000000000000000001";
  const logs = [
    { address: USDM, topics: [TRANSFER_TOPIC, otherTopic, otherTopic], data: "0x01" },
    { address: USDM, topics: [TRANSFER_TOPIC, otherTopic, topicForAddress(RECIPIENT)], data: "0x02c63cbb6ffd7c00" },
  ];
  assert.equal(readTransferAmount(logs, USDM, RECIPIENT), 199914009200000000n);
});

test("readTransferAmount returns null when no matching transfer is present", () => {
  const logs = [
    {
      address: "0x0000000000000000000000000000000000000001",
      topics: [TRANSFER_TOPIC, topicForAddress(RECIPIENT), topicForAddress(RECIPIENT)],
      data: "0x05",
    },
  ];
  assert.equal(readTransferAmount(logs, USDM, RECIPIENT), null);
});

test("fxSwapRequestSchema requires from, to, amount, and recipient", () => {
  const valid = fxSwapRequestSchema.safeParse({ from: "USDC", to: "USDM", amount: "0.2", recipient: RECIPIENT });
  assert.equal(valid.success, true);
  const missingRecipient = fxSwapRequestSchema.safeParse({ from: "USDC", to: "USDM", amount: "0.2" });
  assert.equal(missingRecipient.success, false);
});
