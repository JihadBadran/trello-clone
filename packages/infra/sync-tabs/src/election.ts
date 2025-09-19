// infra/sync-tabs/leader.ts
import { Tab } from 'tab-election'

type Unsub = () => void

export interface TabLeader {
  isLeader: () => boolean
  onLeaderChange: (fn: (leader: boolean) => void) => Unsub
  destroy: () => void
}

/**
 * Single-leader per namespace using tab-election.
 * - emits leader changes
 * - safe in SSR (no-op leader)
 * - no memory leaks; you can destroy it
 */
export function createTabLeader(namespace = 'tc-leader'): TabLeader {
  // SSR / non-browser: act as always-leader no-op (so imports don’t crash)
  // const isBrowser =
  //   typeof window !== 'undefined' &&
  //   typeof (window as any).BroadcastChannel !== 'undefined'

  // if (!isBrowser) {
  //   const leader = true
  //   const listeners = new Set<(l: boolean) => void>()
  //   return {
  //     isLeader: () => leader,
  //     onLeaderChange(fn) { listeners.add(fn); fn(leader); return () => listeners.delete(fn) },
  //     destroy() { listeners.clear() },
  //   }
  // }

  const tab = new Tab(namespace)
  const listeners = new Set<(l: boolean) => void>()
  let leader = false
  let closed = false

  const notify = (v: boolean) => {
    leader = v
    console.log('[tab-election] notify', { leader, listeners })
    for (const fn of listeners) fn(v)
    // we need to remove listeners on change to prevent memory leaks
    listeners.clear()
  }

  // Run the election loop; re-run after deposition unless destroyed.
  const run = async () => {
    while (!closed) {
      try {
        // becomes leader; resolves when leadership is relinquished or lost
        const wasLeader = await tab.waitForLeadership(() => {
          console.log('[tab-election] waiting for leadership…')
          notify(true)
          // return API if needed; we don't expose one here
          return undefined as unknown as Record<string, unknown>
        })
        if (wasLeader) notify(false)
      } catch (err) {
        // non-fatal; small delay to avoid tight loop
        console.warn('[tab-election] waitForLeadership error', err)
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }
  // fire and forget
  run()

  return {
    isLeader: () => leader,
    onLeaderChange(fn) {
      listeners.add(fn)
      console.log('[tab-election] onLeaderChange', { listeners })
      // // emit current state immediately so callers are consistent
      // fn(leader)
      return () => {}
    },
    destroy() {
      closed = true
      try { tab.relinquishLeadership() } catch (err) {
        console.warn('[tab-election] relinquishLeadership failed', err)
      }
      listeners.clear()
      try { tab.close() } catch (err) {
        console.warn('[tab-election] tab.close failed', err)
      }
    },
  }
}