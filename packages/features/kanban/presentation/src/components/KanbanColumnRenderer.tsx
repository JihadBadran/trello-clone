import { Dialog } from '@radix-ui/react-dialog';
import {
  CreateCardForm,
  KanbanCard,
  KanbanCards,
} from '@tc/cards/presentation';
import {
  KanbanColumn,
  KanbanHeader,
} from '@tc/columns/presentation';
import { SortableItem } from '@tc/cards/application-react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tc/uikit/components/ui/dialog';
import { IdCardIcon } from '@tc/uikit/icons';
import type { Column } from '@tc/columns/domain';
import type { Card } from '@tc/cards/domain';
import type { Action } from '@tc/foundation/actions';
import { calculateNextCardPosition } from '../utils/positionUtils';
import { useMemo } from 'react';

interface KanbanColumnRendererProps {
  column: Column;
  allColumns: Column[];
  cards: Card[];
  allCards: Card[];
  boardId: string;
  dispatch: (action: Action) => void;
}

export const KanbanColumnRenderer = ({
  column,
  allColumns,
  cards,
  allCards,
  boardId,
  dispatch,
}: KanbanColumnRendererProps) => {
  const handleCreateCard = (payload: Omit<Card, 'id' | 'created_at' | 'updated_at'>) => {
    dispatch({ type: 'cards/upsert', payload });
  };

  const getNextPosition = () => calculateNextCardPosition(allCards, column.id);

  // Transform Card objects to KanbanItemBase format
  const kanbanItems = useMemo(() => {
    return cards.map(card => ({
      ...card,
      name: card.title,
      column: card.column_id,
    }));
  }, [cards]);

  return (
    <KanbanColumn
      className="flex-grow min-w-[300px]"
      id={column.id}
      key={column.id}
    >
      <KanbanHeader
        boardId={boardId}
        column={column}
        columns={allColumns}
        dispatch={dispatch}
      >
        {column.title}
      </KanbanHeader>
      
      <KanbanCards
        items={kanbanItems}
        columnId={column.id}
        className="flex-1"
      >
        {(card) => (
          <SortableItem id={card.id} key={card.id}>
            <KanbanCard {...card} />
          </SortableItem>
        )}
      </KanbanCards>
      
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
            columnId={column.id}
            getNextPosition={getNextPosition}
            onCreate={handleCreateCard}
          />
        </DialogContent>
      </Dialog>
    </KanbanColumn>
  );
};
