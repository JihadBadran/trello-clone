import type { Board } from '@tc/boards/domain';
import { FeatureRepo } from '@tc/foundation/types';

export interface BoardsRepo extends FeatureRepo<Board>{
  archive(id: string): Promise<void>;
}