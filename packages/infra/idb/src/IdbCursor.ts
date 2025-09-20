import type { CursorApi, ISODateTime, TopicName } from '@tc/foundation/types';
import { getCursor, setCursor } from './meta';

export class IdbCursor implements CursorApi {

  get(topic: TopicName): Promise<ISODateTime | null> {
    return getCursor(topic) as Promise<ISODateTime | null>;
  }

  set(topic: TopicName, value: ISODateTime): Promise<void> {
    return setCursor(topic, value);
  }
}
