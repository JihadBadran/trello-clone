import { useKanbanStore } from '@tc/kanban/application-react';
import { shallow } from 'zustand/shallow';
import type { Card } from '@tc/cards/domain';
import type { Column } from '@tc/columns/domain';

export function KanbanBoard({ boardId }: { boardId: string }) {
  const { board, columns } = useKanbanStore(state => {
    const board = state.boards[boardId];
    const allColumns = Object.values(state.columns);
    const allCards = Object.values(state.cards);

    const columns = allColumns
      .filter((c: Column) => c.board_id === boardId)
      .sort((a, b) => a.position - b.position)
      .map((col: Column) => ({
        ...col,
        cards: allCards
          .filter((c: Card) => c.column_id === col.id && !c.deleted_at)
          .sort((a, b) => a.position - b.position),
      }));

    return { board, columns };
  }, shallow);

  if (!board) return <div>Loading board…</div>;

  return (
    <div className="flex gap-4">
      {columns.map((col) => (
        <div key={col.id} className="w-64 bg-gray-100 p-2 rounded">
          <h3 className="font-bold">{col.title}</h3>
          <div className="flex flex-col gap-2">
            {col.cards.map((c) => (
              <div key={c.id} className="p-2 bg-white rounded shadow">
                {c.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}