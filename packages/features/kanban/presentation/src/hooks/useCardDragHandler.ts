import { useCallback } from 'react';
import { useKanbanDispatch } from '@tc/kanban/application-react';
import type { UniqueIdentifier } from '@dnd-kit/core';

interface CardDragEndParams {
  cardId: UniqueIdentifier;
  targetColumnId: UniqueIdentifier;
  position: number;
  withRepositioning?: boolean;
}

export const useCardDragHandler = () => {
  const dispatch = useKanbanDispatch();

  const handleCardDragEnd = useCallback(
    ({ cardId, targetColumnId, position, withRepositioning }: CardDragEndParams) => {
      dispatch({
        type: 'cards/move',
        payload: {
          cardId,
          targetColumnId,
          position,
          withRepositioning,
        },
      });
    },
    [dispatch]
  );

  return { handleCardDragEnd };
};
