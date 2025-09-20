import { useState } from 'react';
import { Button, Input } from '@tc/uikit';
import { useKanbanDispatch, kanbanStore } from '@tc/kanban/application-react';
import { v4 as uuid } from 'uuid';

export type CreateColumnFormProps = {
  boardId: string;
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
};

export function CreateColumnForm({
  boardId,
  className,
  placeholder = 'New column title',
  buttonLabel = 'Create Column',
}: CreateColumnFormProps) {
  const [title, setTitle] = useState('');
  const dispatch = useKanbanDispatch();

  const nextPosition = kanbanStore((s) => {
    const cols = Object.values(s.columns)
      .filter((c) => c.board_id === boardId && !c.deleted_at)
      .sort((a, b) => a.position - b.position);
    const STEP = 100;
    return cols.length > 0 ? cols[cols.length - 1].position + STEP : STEP;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;

    const now = new Date().toISOString();
    const payload = {
      id: uuid(),
      board_id: boardId,
      title: value,
      position: nextPosition,
      created_at: now,
      updated_at: now,
      deleted_at: null as string | null,
    };

    dispatch({ type: 'columns/create', payload });
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

export default CreateColumnForm;
