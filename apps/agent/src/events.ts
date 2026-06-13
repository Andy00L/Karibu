import type { KaribuEvent } from "@karibu/state-contract";
import { parseKaribuEvent } from "@karibu/state-contract";
import { logError } from "./logger.js";

export type EventSubscriber = (event: KaribuEvent) => void;

// In-process pub/sub for the SSE stream. Every event is validated against the
// public contract before fan-out, so an invalid event never reaches a client.
export class EventBus {
  private readonly subscribers = new Set<EventSubscriber>();

  subscribe(subscriber: EventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  emit(event: KaribuEvent): void {
    const validation = parseKaribuEvent(event);
    if (!validation.ok) {
      logError("EventBus.emit", "refused to emit an invalid event", { error: validation.error });
      return;
    }
    for (const subscriber of this.subscribers) {
      subscriber(validation.value);
    }
  }

  subscriberCount(): number {
    return this.subscribers.size;
  }
}
