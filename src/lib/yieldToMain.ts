/**
 * yieldToMain.ts
 * ══════════════
 * Yields control back to the browser's main thread so it can process
 * pending input events, paint frames, and run higher-priority tasks.
 *
 * Priority order:
 *  1. scheduler.yield()      — Chrome 115+, best: preserves task priority
 *  2. scheduler.postTask()   — Chrome 94+, good: explicit "background" priority
 *  3. MessageChannel         — all modern browsers, no 4ms clamp like setTimeout
 *  4. setTimeout(0)          — universal fallback (clamped to ~4ms in some envs)
 *
 * Usage:
 *   import { yieldToMain, yieldEvery50ms } from '@/lib/yieldToMain';
 *
 *   // Basic yield inside a handler
 *   setSaving(true);
 *   await yieldToMain();          // browser paints, input events drain
 *   await heavyApiCall();
 *
 *   // Yield inside a large loop
 *   for (let i = 0; i < items.length; i++) {
 *     process(items[i]);
 *     await yieldEvery50ms();     // yields only when >50ms has elapsed
 *   }
 */

// ─── Core yield ───────────────────────────────────────────────────────────────

declare global {
  interface Scheduler {
    yield(): Promise<void>;
    postTask<T>(callback: () => T, options?: { priority?: string }): Promise<T>;
  }
  const scheduler: Scheduler | undefined;
}

/**
 * Yields to the main thread once.
 * Uses the fastest available API for the current browser.
 */
export async function yieldToMain(): Promise<void> {
  // scheduler.yield — Chrome 115+, optimal: resumes at same priority
  if (typeof scheduler !== "undefined" && typeof scheduler.yield === "function") {
    return scheduler.yield();
  }

  // scheduler.postTask with "background" priority — Chrome 94+
  if (
    typeof scheduler !== "undefined" &&
    typeof scheduler.postTask === "function"
  ) {
    return scheduler.postTask(() => {}, { priority: "background" });
  }

  // MessageChannel — zero-clamped, works everywhere
  return new Promise<void>((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => resolve();
    port2.postMessage(null);
  });
}

// ─── Loop helper ─────────────────────────────────────────────────────────────

/**
 * Call inside loops. Yields only when ≥50ms has elapsed since the last yield
 * so you don't pay the overhead on every single iteration.
 *
 * @example
 *   const shouldYield = createYieldEvery50ms();
 *   for (const item of largeArray) {
 *     process(item);
 *     await shouldYield();
 *   }
 */
export function createYieldEvery50ms(): () => Promise<void> {
  let lastYield = performance.now();
  return async function maybeYield(): Promise<void> {
    const now = performance.now();
    if (now - lastYield >= 50) {
      lastYield = now;
      await yieldToMain();
    }
  };
}

// ─── Action wrapper ───────────────────────────────────────────────────────────

/**
 * Wraps a user-triggered action so the UI updates first (loading state, feedback)
 * and the heavy work runs after a yield.
 *
 * @param uiWork    Synchronous updates to flush immediately (setState calls)
 * @param heavyWork The async operation (API calls, data processing)
 *
 * @example
 *   await withYield(
 *     () => { setSaving(true); setMessage(null); },
 *     async () => { await supabase.from('settings').upsert(data); }
 *   );
 */
export async function withYield(
  uiWork: () => void,
  heavyWork: () => Promise<void>
): Promise<void> {
  uiWork();             // flush UI update synchronously
  await yieldToMain();  // let browser paint + drain input queue
  await heavyWork();    // do the real work
}

// ─── CSV conversion with yielding ────────────────────────────────────────────

/**
 * Converts a large array to CSV string, yielding every 50ms so the main
 * thread is never blocked for long during big exports.
 */
export async function convertToCSVAsync(data: Record<string, unknown>[]): Promise<string> {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows: string[] = [headers.join(",")];
  const maybeYield = createYieldEvery50ms();

  for (const row of data) {
    const cells = headers.map((h) => {
      const value = row[h];
      if (
        typeof value === "string" &&
        (value.includes(",") || value.includes('"') || value.includes("\n"))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? "";
    });
    rows.push(cells.join(","));
    await maybeYield();
  }

  return rows.join("\n");
}