import { makeBroadcaster } from './broadcaster';
import { createTabLeader } from './election';
import { TAB_ID } from './tabId';
import type { Action } from '@tc/foundation/actions';

const bus = makeBroadcaster<Action>('tc-app-actions');
const leader = createTabLeader('tc-app-leader');

/**
 * A singleton for managing cross-tab communication and leader election.
 */
export const tabSync = {
  TAB_ID,
  publish: bus.publish,
  subscribe: bus.subscribe,
  isLeader: leader.isLeader,
  onLeaderChange: leader.onLeaderChange,
  cleanup: () => {
    leader.destroy();
    bus.close();
  },
};
