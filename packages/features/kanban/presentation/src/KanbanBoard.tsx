import type { DragEndEvent } from '@dnd-kit/core';
import { useEffect, useState } from 'react';
import { Dialog, DialogTitle } from '@radix-ui/react-dialog';
import { BoardCollaborators, InviteMemberForm } from '@tc/boards/presentation';
import {
  CreateCardForm,
  KanbanCard,
  KanbanCards,
} from '@tc/cards/presentation';
import {
  CreateColumnForm,
  KanbanColumn,
  KanbanHeader,
} from '@tc/columns/presentation';
import {
  kanbanStore,
  useKanbanBoard,
  useKanbanCards,
  useKanbanColumns,
  useKanbanDispatch,
  useRefreshKanban,
} from '@tc/kanban/application-react';
import { Button, Input } from '@tc/uikit';
import {
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from '@tc/uikit/components/ui/dialog';
import { Columns3Cog, User, Edit, RefreshCw } from '@tc/uikit/icons';
import { KanbanProvider as DndKanbanProvider } from './lib/KanbanProvider';
import { IdCardIcon } from '@tc/uikit/icons';

const KanbanBoardInternal = ({ boardId }: { boardId: string }) => {
  const dispatch = useKanbanDispatch();
  const board = useKanbanBoard(boardId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState(board?.title || '');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useRefreshKanban();
  const session = kanbanStore((s) => s.session);

  useEffect(() => {
    if (board) {
      setNewBoardTitle(board.title);
    }
  }, [board]);

  const setActiveBoardId = kanbanStore((s) => s.setActiveBoardId);

  useEffect(() => {
    setActiveBoardId(boardId);
  }, [boardId, setActiveBoardId]);

  const hydrated = kanbanStore((s) => s.hydrated);
  const cols = useKanbanColumns(boardId);
  const cards = useKanbanCards(boardId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overCard = cards.find((c) => c.id === over.id);
    const overColumn = cols.find((c) => c.id === over.id);

    if (!overCard && !overColumn) return;

    const targetColumnId = overCard ? overCard.column_id : (over.id as string);

    if (!targetColumnId) return;

    let overCardId: string | undefined = undefined;
    let place: 'before' | 'after' | undefined = undefined;

    if (overCard) {
      overCardId = overCard.id;
      const activeRect = event.active.rect.current.translated || event.active.rect.current.initial;
      const overRect = event.over?.rect;
      if (activeRect && overRect) {
        const isAfter = (activeRect.top + activeRect.height / 2) > (overRect.top + overRect.height / 2);
        place = isAfter ? 'after' : 'before';
      } else {
        place = 'after';
      }
    } else {
      // Dropped on a column itself; append to end
      place = 'after';
    }

    dispatch({
      type: 'cards/move',
      payload: {
        cardId: active.id as string,
        targetColumnId,
        overCardId,
        place,
      },
    });
  };

  if (!hydrated || !board) return <div>Loading board…</div>;

  const kanbanColumns = cols
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, name: c.title }));
  const kanbanCards = cards.map((c) => ({
    ...c,
    name: c.title,
    column: c.column_id,
  }));

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* board title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 px-6">
        <h1 className="text-2xl font-bold flex items-center gap-6">
          {/* <Columns3 className="size-8" /> */}
          {board.title}
          {session?.user.id === board.owner_id && (
            <>
              <Edit
                className="h-4 w-4 cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              />
              <Dialog open={isEditingTitle} onOpenChange={setIsEditingTitle}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Board Title</DialogTitle>
                  </DialogHeader>
                  <Input
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      dispatch({
                        type: 'boards/update',
                        payload: { ...board, title: newBoardTitle },
                      });
                      setIsEditingTitle(false);
                    }}
                  >
                    Save
                  </Button>
                </DialogContent>
              </Dialog>
            </>
          )}
        </h1>
        <div className="flex-shrink-0 gap-3 flex items-center">
          <div className="flex-1">
            <BoardCollaborators boardId={boardId} />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                <Columns3Cog className="size-4" />
                Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Column</DialogTitle>
              </DialogHeader>
              <CreateColumnForm boardId={boardId} />
            </DialogContent>
          </Dialog>

          <Button
            variant="default"
            disabled={isRefreshing}
            onClick={async () => {
              setIsRefreshing(true);
              await refresh();
              setIsRefreshing(false);
            }}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

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
        <DndKanbanProvider
          columns={kanbanColumns}
          data={kanbanCards}
          onDragEnd={handleDragEnd}
        >
          {(col) => {
            const column = cols.find((c) => c.id === col.id);
            if (!column) return null;

            const ColumnCardsWithHint = ({ columnId }: { columnId: string }) => {
              return (
                <KanbanCards
                  items={kanbanCards
                    .filter((c) => c.column === columnId)
                    .sort((a, b) => a.position - b.position)}
                  columnId={columnId}
                  className="flex-1"
                >
                  {(card) => (
                    <KanbanCard {...card} name={card.name} key={card.id} />
                  )}
                </KanbanCards>
              );
            };

            return (
              <KanbanColumn
                className="flex-grow min-w-[300px]"
                id={col.id}
                key={col.id}
              >
                <KanbanHeader
                  boardId={boardId}
                  column={column}
                  columns={cols}
                  dispatch={dispatch}
                >
                  {col.name}
                </KanbanHeader>
                <ColumnCardsWithHint columnId={col.id} />
                <Dialog>
                  <DialogTrigger className="m-3 hover:bg-accent p-3 border border-primary border-dashed rounded font-bold text-md flex items-center gap-2 justify-center">
                    <IdCardIcon className="size-6" />
                    New Task
                  </DialogTrigger>
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
                        const STEP = 100;
                        return cardsInCol.length > 0
                          ? cardsInCol[cardsInCol.length - 1].position + STEP
                          : STEP;
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
        </DndKanbanProvider>
      </div>
    </div>
  );
};

export const KanbanBoard = ({ boardId }: { boardId: string }) => {
  return <KanbanBoardInternal boardId={boardId} />;
};
