import type { BoardsRepo } from '@tc/application-boards';
import { compareLww } from '@tc/foundation-utils/lww';

export class SyncController {
  constructor(private deps: { local: BoardsRepo; cloud: BoardsRepo }) {}
  async initialPull() {
    const remote = await this.deps.cloud.getAll();
    for (const b of remote) await this.deps.local.upsert(b);
  }
  // TODO: extend with outbox/push later
}
