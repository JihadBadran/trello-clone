import type { DragEndEvent } from '@dnd-kit/core';
import { Dialog, DialogTitle } from '@radix-ui/react-dialog';
import { InviteMemberForm } from '@tc/boards/presentation';
import { CreateCardForm, KanbanCard, KanbanCards } from '@tc/cards/presentation';
import { CreateColumnForm, KanbanColumn, KanbanHeader } from '@tc/columns/presentation';
import {
  KanbanProvider as StateKanbanProvider,
  useKanbanBoard,
  useKanbanCards,
  useKanbanColumns,
  useKanbanDispatch,
  useKanbanStore,
} from '@tc/kanban/application-react';
import {
  Button
} from '@tc/uikit';
import { DialogContent, DialogHeader, DialogTrigger } from '@tc/uikit/components/ui/dialog';
import { Columns3, Columns3Cog, User } from '@tc/uikit/icons';
import { KanbanProvider } from './lib/KanbanProvider';

// Helper to find the new position of a card after being moved
const getNewPosition = (
  cards: { id: string; position: number }[],
  oldIndex: number,
  newIndex: number
): number => {
  if (newIndex < 0 || oldIndex < 0) return 0;
  if (newIndex === 0) {
    return cards.length > 0 ? cards[0].position / 2 : 1024;
  }
  if (newIndex >= cards.length) {
    return cards[cards.length - 1].position + 1024;
  }
  const prevCard = cards[newIndex - 1];
  const nextCard = cards[newIndex];
  return (prevCard.position + nextCard.position) / 2;
};

const KanbanBoardInternal = ({ boardId }: { boardId: string }) => {
  const dispatch = useKanbanDispatch();

    const hydrated = useKanbanStore(s => s.hydrated);
  const board = useKanbanBoard(boardId);
  const cols = useKanbanColumns(boardId);
  const cards = useKanbanCards(boardId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCard = cards.find((c) => c.id === active.id);
    const overCard = cards.find((c) => c.id === over.id);
    const overColumn = cols.find((c) => c.id === over.id);

    if (!activeCard) return;

    const targetcolumn_id = overCard?.column_id || overColumn?.id;
    if (!targetcolumn_id) return;

    const cardsInTargetColumn = cards
      .filter((c) => c.column_id === targetcolumn_id)
      .sort((a, b) => a.position - b.position);

    const oldIndex = cardsInTargetColumn.findIndex((c) => c.id === active.id);
    const newIndex = cardsInTargetColumn.findIndex((c) => c.id === over.id);

    const newPosition = getNewPosition(cardsInTargetColumn, oldIndex, newIndex);

    dispatch({
      type: 'cards/upsert',
      payload: {
        ...activeCard,
        column_id: targetcolumn_id,
        position: newPosition,
      },
    });
  };

    if (!hydrated || !board) return <div>Loading board…</div>;

  const kanbanColumns = cols.map((c) => ({ id: c.id, name: c.title }));
  const kanbanCards = cards.map((c) => ({
    ...c,
    name: c.title,
    column: c.column_id,
  }));

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* board title */}
      <div className="flex items-center justify-between gap-2 px-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Columns3 className="size-8" />
          {board.title}
        </h1>
        <div className="flex-shrink-0 gap-3 flex items-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                <Columns3Cog className="size-4" />
                Add Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Column</DialogTitle>
              </DialogHeader>
              <CreateColumnForm boardId={boardId} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                <User className="size-4" />
                Collaborate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Collaborator</DialogTitle>
              </DialogHeader>

              <InviteMemberForm boardId={boardId} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex flex-1 overflow-auto">
        <KanbanProvider
          columns={kanbanColumns}
          data={kanbanCards}
          onDragEnd={handleDragEnd}
        >
          {(col) => {
            return (
              <KanbanColumn
                className="flex-grow min-w-[300px]"
                id={col.id}
                key={col.id}
              >
                <KanbanHeader>{col.name}</KanbanHeader>
                <KanbanCards items={kanbanCards} columnId={col.id} className="flex-1">
                  {(card) => (
                    <KanbanCard {...card} name={card.name} key={card.id} />
                  )}
                </KanbanCards>
                <Dialog>
                  <DialogTrigger className='m-3 hover:bg-accent p-3 border border-primary border-dashed rounded'>New Task</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>New Task</DialogTitle>
                    </DialogHeader>
                    <CreateCardForm
                      boardId={boardId}
                      columnId={col.id}
                      getNextPosition={() => {
                        const cardsInCol = cards
                          .filter(
                            (c) => c.column_id === col.id && !c.deleted_at
                          )
                          .sort((a, b) => a.position - b.position);
                        return cardsInCol.length > 0
                          ? cardsInCol[cardsInCol.length - 1].position + 1024
                          : 1024;
                      }}
                      onCreate={(payload) =>
                        dispatch({ type: 'cards/upsert', payload })
                      }
                    />
                  </DialogContent>
                </Dialog>
              </KanbanColumn>
            );
          }}
        </KanbanProvider>
      </div>
    </div>
  );
}

export const KanbanBoard = ({ boardId }: { boardId: string }) => {
  return (
    <StateKanbanProvider>
      <KanbanBoardInternal boardId={boardId} />
    </StateKanbanProvider>
  );
};
