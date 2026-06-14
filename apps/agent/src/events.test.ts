import { test } from "node:test";
import assert from "node:assert/strict";
import { parseKaribuEvent } from "@karibu/state-contract";
import { EventBus } from "./events.js";

test("a throwing subscriber does not stop the other subscribers", () => {
  const bus = new EventBus();
  const receivedTypes: string[] = [];
  bus.subscribe(() => {
    throw new Error("dead connection");
  });
  bus.subscribe((event) => {
    receivedTypes.push(event.type);
  });
  bus.emit({ type: "human_verified", walletShort: "0x1234..ef9f" });
  assert.equal(receivedTypes.length, 1);
  assert.equal(receivedTypes[0], "human_verified");
});

test("a throwing subscriber is dropped after it fails", () => {
  const bus = new EventBus();
  bus.subscribe(() => {
    throw new Error("dead connection");
  });
  assert.equal(bus.subscriberCount(), 1);
  bus.emit({ type: "human_verified", walletShort: "0x1234..ef9f" });
  assert.equal(bus.subscriberCount(), 0);
});

test("the event validator refuses a malformed event", () => {
  const result = parseKaribuEvent({ type: "service_paid" });
  assert.equal(result.ok, false);
});
