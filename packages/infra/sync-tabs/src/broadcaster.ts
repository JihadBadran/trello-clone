/**
 * Lightweight BroadcastChannel wrapper for cross-tab action/event fan-out.
 * If you need a polyfill, you can swap this implementation later.
 */
export type Unsub = () => void;

export function makeBroadcaster<T = unknown>(name: string) {
  const b = new BroadcastChannel(name);
  let ch: typeof b;

  // why? because ts does not want to see BroadcastChannel as a type
  b.close();
  let isClosed = true;
  const handlers = new Set<(msg: T) => void>();

  const onMessage = (ev: unknown) => {
    handlers.forEach((h) => h((ev as MessageEvent).data as T));
  };

  const ensureChannel = () => {
    if (isClosed) {
      ch = new BroadcastChannel(name);
      ch.onmessage = onMessage;
      isClosed = false;
    }
  };

  ensureChannel(); // Initial channel creation

  return {
    publish(msg: T) {
      ensureChannel();
      try {
        ch?.postMessage(msg);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'InvalidStateError') {
          // This can happen if the channel is closed by another means.
          // We'll reopen it and retry.
          isClosed = true;
          ensureChannel();
          ch.postMessage(msg);
        } else {
          throw e;
        }
      }
    },
    subscribe(fn: (msg: T) => void): Unsub {
      ensureChannel();
      handlers.add(fn);
      return () => handlers.delete(fn);
    },
    close() {
      if (!isClosed) {
        handlers.clear();
        ch.close();
        isClosed = true;
      }
    },
  };
}
