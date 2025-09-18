import { useState } from 'react';
import { Button, Input } from '@tc/uikit';
import { useKanbanDispatch, useKanbanStore } from '@tc/kanban/application-react';
import { v4 as uuid } from 'uuid';

export type CreateCardFormProps = {
  boardId: string;
  columnId: string;
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
};

export function CreateCardForm({
  boardId,
  columnId,
  className,
  placeholder = 'New card title',
  buttonLabel = 'Create Card',
}: CreateCardFormProps) {
  const [title, setTitle] = useState('');
  const dispatch = useKanbanDispatch();

  const nextPosition = useKanbanStore((s) => {
    const cards = Object.values(s.cards)
      .filter((c) => c.board_id === boardId && c.column_id === columnId && !c.deleted_at)
      .sort((a, b) => a.position - b.position);
    return cards.length > 0 ? cards[cards.length - 1].position + 1024 : 1024;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;

    const now = new Date().toISOString();
    const payload = {
      id: uuid(),
      board_id: boardId,
      column_id: columnId,
      title: value,
      position: nextPosition,
      created_at: now,
      updated_at: now,
      deleted_at: null as string | null,
      description: null as string | null,
      due_date: null as string | null,
      assignee_id: null as string | null,
    };

    dispatch({ type: 'cards/upsert', payload });
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className={['p-2', className].filter(Boolean).join(' ')}>
      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        placeholder={placeholder}
        className="mb-2"
      />
      <Button type="submit">{buttonLabel}</Button>
    </form>
  );
}

export default CreateCardForm;
