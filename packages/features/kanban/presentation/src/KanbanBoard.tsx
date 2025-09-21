import { useEffect } from 'react';
import { KanbanCard } from '@tc/cards/presentation';
import {
  kanbanStore,
  useKanbanBoard,
  useKanbanCards,
  useKanbanColumns,
  useKanbanDispatch,
  useRefreshKanban,
} from '@tc/kanban/application-react';
import {
  KanbanProvider as DndKanbanProvider,
} from './lib/KanbanProvider';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

import { BoardTitleEditor } from './components/BoardTitleEditor';
import { BoardActionButtons } from './components/BoardActionButtons';
import { KanbanColumnRenderer } from './components/KanbanColumnRenderer';
import { useCardDragHandler } from './hooks/useCardDragHandler';

interface KanbanBoardProps {
  boardId: string;
}

const useKanbanBoardData = (boardId: string) => {
  const dispatch = useKanbanDispatch();
  const board = useKanbanBoard(boardId);
  const columns = useKanbanColumns(boardId);
  const cards = useKanbanCards(boardId);
  const refresh = useRefreshKanban();
  const session = kanbanStore((s) => s.session);
  const hydrated = kanbanStore((s) => s.hydrated);
  const setActiveBoardId = kanbanStore((s) => s.setActiveBoardId);

  useEffect(() => {
    setActiveBoardId(boardId);
  }, [boardId, setActiveBoardId]);

  const sortedColumns = columns.sort((a, b) => a.position - b.position);
  const dndColumns = sortedColumns.map((column) => ({
    ...column,
    id: column.id,
    name: column.title,
  }));
  
  const dndCards = cards.map((card) => ({
    ...card,
    id: card.id,
    name: card.title,
    column: card.column_id,
  }));

  const isOwner = session?.user.id === board?.owner_id;

  return {
    dispatch,
    board,
    columns: sortedColumns,
    cards,
    dndColumns,
    dndCards,
    refresh,
    hydrated,
    isOwner,
  };
};

const KanbanBoardInternal = ({ boardId }: KanbanBoardProps) => {
  const {
    dispatch,
    board,
    columns,
    cards,
    dndColumns,
    dndCards,
    refresh,
    hydrated,
    isOwner,
  } = useKanbanBoardData(boardId);
  
  const { handleCardDragEnd } = useCardDragHandler();

  if (!hydrated || !board) {
    return <div>Loading board…</div>;
  }

  return (
    <div className="flex flex-col flex-1 gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-6">
        <h1 className="text-2xl font-bold flex items-center gap-6">
          <BoardTitleEditor
            board={board}
            isOwner={isOwner}
            onUpdateTitle={dispatch}
          />
        </h1>
        <BoardActionButtons
          boardId={boardId}
          onRefresh={refresh}
        />
      </div>
      <div className="flex flex-1 overflow-auto px-6">
        <DndKanbanProvider
          boardId={boardId}
          columns={dndColumns}
          onDragEndCard={handleCardDragEnd}
          renderCardDragOverlay={(card) => <KanbanCard {...card} />}
        >
          <div className="flex-1 flex flex-row w-full gap-4 py-2">
            <SortableContext
              items={dndColumns.map((column) => column.id)}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((column) => (
                <KanbanColumnRenderer
                  key={column.id}
                  column={column}
                  allColumns={columns}
                  cards={dndCards}
                  allCards={cards}
                  boardId={boardId}
                  dispatch={dispatch}
                />
              ))}
            </SortableContext>
          </div>
        </DndKanbanProvider>
      </div>
    </div>
  );
};

export const KanbanBoard = ({ boardId }: KanbanBoardProps) => {
  return <KanbanBoardInternal boardId={boardId} />;
};
