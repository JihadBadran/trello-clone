import { useCallback } from 'react';
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  UniqueIdentifier
} from '@dnd-kit/core';
import type { Action } from '@tc/foundation/actions';
import type { Card } from '@tc/cards/domain';
import { findContainer } from '../utils/containerUtils';
import { calculateDragPosition, getMinGap } from '../utils/positionUtils';
import type { Items } from '../utils/containerUtils';

interface UseDragHandlersProps {
  items: Items;
  storeCards: Card[];
  dispatch: (action: Action, options?: { localOnly?: boolean }) => Promise<void>;
  onDragOverCard?: (activeId: UniqueIdentifier, overId: UniqueIdentifier) => void;
  onDragEndCard: (props: {
    cardId: UniqueIdentifier;
    targetColumnId: UniqueIdentifier;
    position: number;
    withRepositioning: boolean;
  }) => void;
  onDragCancel?: () => void;
  setActiveId: (id: UniqueIdentifier | null) => void;
  setClonedItems: (items: Items | null) => void;
  recentlyMovedToNewContainer: React.MutableRefObject<boolean>;
}

/**
 * Custom hook for handling drag and drop operations in the Kanban board
 * Manages card movement between columns and within columns
 */
export const useDragHandlers = ({
  items,
  storeCards,
  dispatch,
  onDragOverCard,
  onDragEndCard,
  onDragCancel,
  setActiveId,
  setClonedItems,
  recentlyMovedToNewContainer,
}: UseDragHandlersProps) => {
  /**
   * Helper function to get filtered and sorted cards for a specific column
   * Excludes the currently dragged card to calculate proper positioning
   */
  const getColumnCards = useCallback((columnId: UniqueIdentifier, excludeCardId: UniqueIdentifier) => {
    return storeCards
      .filter((card) =>
        String(card.column_id) === String(columnId) &&
        card.id !== excludeCardId
      )
      .sort((a, b) => a.position - b.position);
  }, [storeCards]);

  /**
   * Determines if repositioning is needed based on position conflicts or tight spacing
   */
  const shouldReposition = useCallback((cards: Card[], newPosition: number) => {
    const minGap = getMinGap(cards);
    const hasPositionConflict = cards.some(card => card.position === newPosition);
    return minGap < 2 || hasPositionConflict;
  }, []);
  /**
   * Handles the start of a drag operation
   * Sets the active card and creates a snapshot of current items
   */
  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id);
    setClonedItems(items);
  }, [items, setActiveId, setClonedItems]);

  /**
   * Handles drag over events for cross-container moves
   * Optimistically updates the card position when dragging between columns
   */
  const handleDragOver = useCallback(async ({ active, over }: DragOverEvent) => {
    const overId = over?.id;

    // Early returns for invalid drag operations
    if (overId == null || active.id in items) {
      return;
    }

    onDragOverCard?.(active.id, overId);

    const overContainer = findContainer(overId, items);
    const activeContainer = findContainer(active.id, items);

    // Only handle cross-container moves in dragOver
    if (!overContainer || !activeContainer || activeContainer === overContainer) {
      return;
    }

    const overItems = items[overContainer];
    const overIndex = overItems.indexOf(overId);

    const newIndex = overId in items
      ? overItems.length + 1
      : calculateNewIndex(over, active, overIndex, overItems);

    recentlyMovedToNewContainer.current = true;

    const targetCards = getColumnCards(overContainer, active.id);
    const newPosition = calculateDragPosition(targetCards, newIndex);

    await dispatch({
      type: 'cards/move',
      payload: {
        cardId: active.id.toString(),
        targetColumnId: overContainer.toString(),
        position: newPosition,
        withRepositioning: shouldReposition(targetCards, newPosition),
      },
    });
  }, [items, storeCards, dispatch, onDragOverCard, getColumnCards, shouldReposition]);

  /**
   * Handles the end of a drag operation
   * Finalizes card positioning for both same-container and cross-container moves
   */
  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    const activeContainer = findContainer(active.id, items);

    if (!activeContainer) {
      setActiveId(null);
      return;
    }

    const overId = over?.id;
    if (overId == null) {
      setActiveId(null);
      return;
    }

    const overContainer = findContainer(overId, items);

    if (overContainer) {
      const activeIndex = items[activeContainer].indexOf(active.id);
      const overIndex = items[overContainer].indexOf(overId);

      // Handle same-container moves
      if (activeContainer === overContainer && activeIndex !== overIndex) {
        const containerCards = getColumnCards(overContainer, active.id);
        const newPosition = calculateDragPosition(containerCards, overIndex);

        onDragEndCard({
          cardId: active.id,
          targetColumnId: overContainer,
          position: newPosition,
          withRepositioning: shouldReposition(containerCards, newPosition),
        });
      }

      // Handle cross-container moves (already processed in onDragOver)
      if (activeContainer !== overContainer) {
        const containerCards = getColumnCards(overContainer, active.id);
        const finalIndex = items[overContainer].indexOf(active.id);
        const newPosition = calculateDragPosition(containerCards, finalIndex);

        onDragEndCard({
          cardId: active.id,
          targetColumnId: overContainer,
          position: newPosition,
          withRepositioning: shouldReposition(containerCards, newPosition),
        });
      }
    }

    setActiveId(null);
    setClonedItems(null);
  }, [items, onDragEndCard, setActiveId, setClonedItems, getColumnCards, shouldReposition]);

  /**
   * Handles drag cancellation
   * Resets the drag state without making any changes
   */
  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setClonedItems(null);
    onDragCancel?.();
  }, [setActiveId, setClonedItems, onDragCancel]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
};

/**
 * Calculates the new index for a dragged item based on its position relative to the drop target
 * Uses the visual position of the dragged item to determine if it should be placed before or after the target
 */
const calculateNewIndex = (
  over: { rect: { top: number; height: number } } | null,
  active: { rect: { current: { translated: { top: number } | null } | null } },
  overIndex: number,
  overItems: UniqueIdentifier[]
): number => {
  if (!over || !active.rect.current?.translated) {
    return overItems.length + 1;
  }

  const isBelowOverItem = active.rect.current.translated.top > over.rect.top + over.rect.height;
  const modifier = isBelowOverItem ? 1 : 0;
  return overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
};
