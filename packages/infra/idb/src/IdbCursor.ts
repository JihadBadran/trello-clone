import type { CursorApi } from '@tc/infra/sync-cloud';
import { getCursor, setCursor } from './meta';

export class IdbCursor implements CursorApi {
  constructor(private namespace: string) {}

  get() {
    return getCursor(this.namespace);
  }

  set(value: string) {
    return setCursor(this.namespace, value);
  }
}
