'use client';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
  CollisionDetection,
  closestCenter,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
  getFirstCollision,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  useState,
  useCallback,
  createContext,
  useContext,
  ReactNode,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useKanbanCards, useKanbanDispatch } from '@tc/kanban/application-react';
import type { Card } from '@tc/cards/domain';

/**
 * Calculate new position based on target index in sorted array
 *
 * Example:
 * [{id: 1, pos: 100}, {id: 2, pos: 200}, {id: 3, pos: 300}]
 * move id:3 to index 1 => position = (100 + 200) / 2 = 150
 * Result: [{id: 1, pos: 100}, {id: 3, pos: 150}, {id: 2, pos: 200}]
 */
function calculateNewPosition(sortedCards: Array<{ position: number }>, targetIndex: number): number {
  const STEP = 100;
  console.log("sorted Cards", sortedCards, targetIndex);

  if (sortedCards.length === 0) {
    return STEP;
  }

  if (targetIndex <= 0) {
    // Moving to the beginning
    return Math.floor(sortedCards[0].position / 2);
  }

  if (targetIndex >= sortedCards.length) {
    // Moving to the end
    return sortedCards[sortedCards.length - 1].position + STEP;
  }

  // Moving between cards - use average of surrounding positions
  const prevCard = sortedCards[targetIndex - 1];
  const nextCard = sortedCards[targetIndex];
  console.log("prevCard", prevCard, "nextCard", nextCard, (prevCard.position + nextCard.position), (prevCard.position + nextCard.position) / 2);
  return Math.floor((prevCard.position + nextCard.position) / 2);
}


export type KanbanItemProps = {
  id: UniqueIdentifier;
  name: string;
  column: UniqueIdentifier;
} & Record<string, unknown>;

export type KanbanColumnProps = {
  id: UniqueIdentifier;
  name: string;
} & Record<string, unknown>;

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

export type KanbanContextProps = {
  items: Items;
  columns: KanbanColumnProps[];
  activeId: UniqueIdentifier | null;
};

export const KanbanContext = createContext<KanbanContextProps>({
  items: {},
  columns: [],
  activeId: null,
});

export const useDndKanban = () => useContext(KanbanContext);

export type KanbanProviderProps = {
  children: ReactNode;
  boardId: string;
  columns: KanbanColumnProps[];
  onDragOverCard?: (
    activeId: UniqueIdentifier,
    overId: UniqueIdentifier
  ) => void;
  onDragEndCard: (props:
    { cardId: UniqueIdentifier,
      targetColumnId: UniqueIdentifier,
      position: number,
    }
  ) => void;
  onDragCancel?: () => void;
  renderCardDragOverlay: (card: KanbanItemProps) => ReactNode;
};

export const KanbanProvider = ({
  children,
  boardId,
  columns,
  onDragOverCard,
  onDragEndCard,
  onDragCancel,
  renderCardDragOverlay,
}: KanbanProviderProps) => {
  const dispatch = useKanbanDispatch();
  const storeCards = useKanbanCards(boardId);

  // Create items structure from store data
  const items = useMemo(() => {
    const newItems: Items = {};
    columns.forEach((col) => {
      newItems[col.id] = storeCards
        .filter((card) => String(card.column_id) === String(col.id))
        .sort((a, b) => a.position - b.position)
        .map((card) => card.id);
    });
    return newItems;
  }, [storeCards, columns]);

  // Store original items for drag cancel (currently unused but kept for future rollback functionality)
  const [clonedItems, setClonedItems] = useState<Items | null>(null);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findContainer = (id: UniqueIdentifier) => {
    if (id in items) {
      return id;
    }

    return Object.keys(items).find((key) => items[key].includes(id));
  };

  const getIndex = (id: UniqueIdentifier) => {
    const container = findContainer(id);

    if (!container) {
      return -1;
    }

    const index = items[container].indexOf(id);

    return index;
  };

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
            pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        if (overId in items) {
          const containerItems = items[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
    setClonedItems(items);
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    const overId = over?.id;

    if (overId == null || active.id in items) {
      return;
    }

    // Call the optional onDragOverCard callback
    if (onDragOverCard && overId) {
      onDragOverCard(active.id, overId);
    }

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer) {
      return;
    }

    if (activeContainer !== overContainer) {
      const overItems = items[overContainer];
      const overIndex = overItems.indexOf(overId);

      let newIndex: number;

      if (overId in items) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top >
            over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;

        newIndex =
          overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      recentlyMovedToNewContainer.current = true;

      // Calculate new position based on the target index using better algorithm
      const targetCards = storeCards
        .filter((card) => String(card.column_id) === String(overContainer) && card.id !== active.id)
        .sort((a, b) => a.position - b.position);

      const newPosition = calculateNewPosition(targetCards, newIndex);

      // Dispatch the move action to the store
      dispatch({
        type: 'cards/move',
        payload: {
          cardId: active.id.toString(),
          targetColumnId: overContainer.toString(),
          position: newPosition,
        },
      });
    }
  };

  const handleDragCancel = () => {
    // For now, we'll rely on the store's natural state management
    // In the future, we could implement store-level rollback if needed
    setActiveId(null);
    setClonedItems(null);
    onDragCancel?.();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeContainer = findContainer(active.id);

    if (!activeContainer) {
      setActiveId(null);
      return;
    }

    const overId = over?.id;

    if (overId == null) {
      setActiveId(null);
      return;
    }

    const overContainer = findContainer(overId);

    if (overContainer) {
      const activeIndex = items[activeContainer].indexOf(active.id);
      const overIndex = items[overContainer].indexOf(overId);

      // Handle moves within the same container
      if (activeContainer === overContainer && activeIndex !== overIndex) {
        const containerCards = storeCards
          .filter((card) => String(card.column_id) === String(overContainer) && card.id !== active.id)
          .sort((a, b) => a.position - b.position);

        const newPosition = calculateNewPosition(containerCards, overIndex);
        console.log("newPosition", newPosition);

        // Dispatch the move action to the store
        // dispatch({
        //   type: 'cards/move',
        //   payload: {
        //     cardId: active.id.toString(),
        //     targetColumnId: overContainer.toString(),
        //     position: newPosition,
        //   },
        // });

        // Call the callback with updated items
        if (activeId && overContainer) {
          onDragEndCard({
            cardId: activeId,
            targetColumnId: overContainer,
            position: newPosition,
          });
        }
      }

      // Handle cross-container moves that were already handled in onDragOver
      if (activeContainer !== overContainer) {
        // The items have already been moved in onDragOver, just call the callback
        const finalItems = items[overContainer];
        const finalIndex = finalItems.indexOf(active.id);
        const newPosition = calculateNewPosition(finalItems, finalIndex);
        onDragEndCard({
          cardId: active.id,
          targetColumnId: overContainer,
          position: newPosition,
        });
      }
    }

    setActiveId(null);
    setClonedItems(null);
  };

  const activeCard = activeId ? storeCards.find((c) => c.id === activeId) : null;

  // Convert Card to KanbanItemProps for drag overlay
  const adaptCardToKanbanItem = (card: Card): KanbanItemProps => ({
    id: card.id,
    name: card.title,
    column: card.column_id,
  });

  return (
    <KanbanContext.Provider value={{ items, columns, activeId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        {createPortal(
          <DragOverlay>
            {activeCard ? renderCardDragOverlay(adaptCardToKanbanItem(activeCard)) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </KanbanContext.Provider>
  );
};
