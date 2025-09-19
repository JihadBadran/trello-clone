import { useState } from 'react';
import { Button, Input } from '@tc/uikit';
import type { Card } from '@tc/cards/domain';
import { v4 as uuid } from 'uuid';

export type CreateCardFormProps = {
  boardId: string;
  columnId: string;
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
  getNextPosition: () => number;
  onCreate: (payload: Card) => void | Promise<void>;
};

export function CreateCardForm({
  boardId,
  columnId,
  className,
  placeholder = 'New card title',
  buttonLabel = 'Create Card',
  getNextPosition,
  onCreate,
}: CreateCardFormProps) {
  const [title, setTitle] = useState('');

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
      position: getNextPosition(),
      created_at: now,
      updated_at: now,
      deleted_at: null as string | null,
      description: null as string | null,
      due_date: null as string | null,
      assignee_id: null as string | null,
    } as Card;

    onCreate(payload);
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

