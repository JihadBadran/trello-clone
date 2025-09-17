// infra/sync-tabs/leader.ts
import { Tab } from 'tab-election'

type Unsub = () => void;

interface TabLeader {
  isLeader: () => boolean;
  onLeaderChange: (fn: (leader: boolean) => void) => Unsub;
  destroy: () => void;
}

export function createTabLeader(namespace = 'tc-leader'): TabLeader {
  // Create a new Tab in this namespace
  const tab = new Tab(namespace);

  let leader = false;
  const listeners = new Set<(leader: boolean) => void>();

  // Internal helper to update state & notify listeners
  const setLeader = (v: boolean) => {
    leader = v;
    for (const fn of listeners) fn(v);
  };

  // Use waitForLeadership to trigger being leader
  tab.waitForLeadership(async (relinquish) => {
    // this callback is called when this tab becomes leader
    setLeader(true);

    // wait until leadership is relinquished
    // When relinquished, callback returns => tab is no longer leader
    await relinquish;

    setLeader(false);
    // after this, this tab may try again depending on implementation
  }).catch((err) => {
    console.error('[tab-election] error in waitForLeadership:', err);
  });

  return {
    isLeader: () => leader,
    onLeaderChange(fn: (leader: boolean) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    destroy() {
      listeners.clear();
      tab.close();  // cleanup resources
    }
  }
}