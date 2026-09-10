import { db } from "../db";
import { CloudEvent, FHIRTask, OutboxEvent } from "./types";

export type OutboxListener = (events: OutboxEvent[]) => void;

class OutboxManager {
  private listeners: Set<OutboxListener> = new Set();
  private cceEndpoint: string = 
    (typeof window !== "undefined" && window.localStorage.getItem("openphc_cce_endpoint")) ||
    (import.meta.env?.VITE_CCE_ENDPOINT as string) ||
    "https://honest-otters-arrive.loca.lt/v1/events";

  public subscribe(listener: OutboxListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    try {
      const events = await db.outbox.orderBy("createdAt").reverse().toArray();
      this.listeners.forEach((fn) => fn(events));
    } catch {
      // ignore
    }
  }

  /**
   * Enqueue a new CloudEvent into the local outbox
   */
  public async queueEvent(stepId: string, eventType: string, payload: CloudEvent<FHIRTask>): Promise<OutboxEvent> {
    const outboxItem: OutboxEvent = {
      id: payload.id,
      stepId,
      eventType,
      payload,
      status: "QUEUED",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    await db.outbox.put(outboxItem);
    await this.notify();
    
    // Proactively attempt background sync
    this.attemptSync();
    return outboxItem;
  }

  /**
   * Attempt to sync queued events to OpenPHC CCE collector
   */
  public async attemptSync(): Promise<{ sent: number; failed: number }> {
    const queued = await db.outbox.where("status").equals("QUEUED").toArray();
    if (queued.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const item of queued) {
      try {
        // Test if CCE collector endpoint responds
        const res = await fetch(this.cceEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/cloudevents+json",
            "Bypass-Tunnel-Reminder": "true",
          },
          body: JSON.stringify(item.payload),
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          await db.outbox.update(item.id, {
            status: "SENT",
            lastAttemptAt: new Date().toISOString(),
          });
          sentCount++;
        } else {
          await db.outbox.update(item.id, {
            retryCount: item.retryCount + 1,
            lastAttemptAt: new Date().toISOString(),
            errorMessage: `HTTP ${res.status}: ${res.statusText}`,
          });
          failedCount++;
        }
      } catch (err: any) {
        // Endpoint unreachable or offline - normal offline-first behavior (AP-6)
        await db.outbox.update(item.id, {
          retryCount: item.retryCount + 1,
          lastAttemptAt: new Date().toISOString(),
          errorMessage: err.name === "TimeoutError" ? "CCE Server Timeout" : "Offline: CCE Collector Unreachable",
        });
        failedCount++;
      }
    }

    await this.notify();
    return { sent: sentCount, failed: failedCount };
  }

  /**
   * Clear all synced events from local outbox history
   */
  public async clearSentEvents(): Promise<void> {
    const sent = await db.outbox.where("status").equals("SENT").toArray();
    await db.outbox.bulkDelete(sent.map((s) => s.id));
    await this.notify();
  }

  public setEndpoint(url: string) {
    this.cceEndpoint = url;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("openphc_cce_endpoint", url);
    }
  }

  public getEndpoint(): string {
    return this.cceEndpoint;
  }
}

export const outboxManager = new OutboxManager();
