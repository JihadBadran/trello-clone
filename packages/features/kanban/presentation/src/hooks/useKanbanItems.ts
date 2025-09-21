import { useMemo } from 'react';
import type { UniqueIdentifier } from '@dnd-kit/core';
import type { Card } from '@tc/cards/domain';
import type { Items } from '../utils/containerUtils';

export interface KanbanColumnProps {
  id: UniqueIdentifier;
  name: string;
}

export const useKanbanItems = (
  storeCards: Card[], 
  columns: KanbanColumnProps[]
): Items => {
  return useMemo(() => {
    const items: Items = {};
    
    columns.forEach((column) => {
      items[column.id] = storeCards
        .filter((card) => String(card.column_id) === String(column.id))
        .sort((a, b) => a.position - b.position)
        .map((card) => card.id);
    });
    
    return items;
  }, [storeCards, columns]);
};
