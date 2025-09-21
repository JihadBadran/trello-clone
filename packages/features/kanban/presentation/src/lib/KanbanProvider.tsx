'use client';
import {
  DndContext,
  DragOverlay,
  UniqueIdentifier,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  useState,
  createContext,
  useContext,
  ReactNode,
  useRef,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useKanbanCards, useKanbanDispatch } from '@tc/kanban/application-react';
import type { Card } from '@tc/cards/domain';

import { useKanbanItems, type KanbanColumnProps } from '../hooks/useKanbanItems';
import { useCollisionDetection } from '../hooks/useCollisionDetection';
import { useDragHandlers } from '../hooks/useDragHandlers';
import { useDndSensors } from '../hooks/useDndSensors';
import type { Items } from '../utils/containerUtils';



export type KanbanItemProps = {
  id: UniqueIdentifier;
  name: string;
  column: UniqueIdentifier;
} & Record<string, unknown>;

export interface KanbanContextProps {
  items: Items;
  columns: KanbanColumnProps[];
  activeId: UniqueIdentifier | null;
}

export const KanbanContext = createContext<KanbanContextProps>({
  items: {},
  columns: [],
  activeId: null,
});

export const useDndKanban = () => useContext(KanbanContext);

export interface KanbanProviderProps {
  children: ReactNode;
  boardId: string;
  columns: KanbanColumnProps[];
  onDragOverCard?: (
    activeId: UniqueIdentifier,
    overId: UniqueIdentifier
  ) => void;
  onDragEndCard: (props: {
    cardId: UniqueIdentifier;
    targetColumnId: UniqueIdentifier;
    position: number;
  }) => void;
  onDragCancel?: () => void;
  renderCardDragOverlay: (card: KanbanItemProps) => ReactNode;
}

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
  
  // State management
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [, setClonedItems] = useState<Items | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  
  // Custom hooks
  const items = useKanbanItems(storeCards, columns);
  const sensors = useDndSensors();
  const collisionDetectionStrategy = useCollisionDetection({
    activeId,
    items,
    lastOverId,
    recentlyMovedToNewContainer,
  });
  
  const { handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useDragHandlers({
    items,
    storeCards,
    dispatch,
    onDragOverCard,
    onDragEndCard,
    onDragCancel,
    setActiveId,
    setClonedItems,
    recentlyMovedToNewContainer,
  });

  // Reset container movement flag after items change
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  // Get active card for drag overlay
  const activeCard = activeId ? storeCards.find((card) => card.id === activeId) : null;

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
