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
    // One failed subscriber (a dead SSE connection whose write throws) must not
    // stop the others or propagate to the emitter. Isolate each, and drop the
    // ones that fail.
    const failedSubscribers: EventSubscriber[] = [];
    for (const subscriber of this.subscribers) {
      try {
        subscriber(validation.value);
      } catch (subscriberError) {
        const message = subscriberError instanceof Error ? subscriberError.message : String(subscriberError);
        logError("EventBus.emit", "subscriber failed and was dropped", { error: message });
        failedSubscribers.push(subscriber);
      }
    }
    for (const failedSubscriber of failedSubscribers) {
      this.subscribers.delete(failedSubscriber);
    }
  }

  subscriberCount(): number {
    return this.subscribers.size;
  }
}
