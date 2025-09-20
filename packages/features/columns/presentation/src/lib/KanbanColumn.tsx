'use client';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@tc/uikit';
import { HTMLAttributes, ReactNode, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Button } from '@tc/uikit';
import { MoreHorizontal } from 'lucide-react';
import { Column } from '@tc/columns/domain';
import { Action } from '@tc/foundation/actions';

export type KanbanBoardProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

export const KanbanColumn = ({ id, children, className }: KanbanBoardProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  return (
    <div
      className={cn(
        'flex size-full min-h-40 flex-col divide-y overflow-hidden rounded-md bg-secondary text-xs shadow-sm transition-all border-2',
        isOver ? 'border-primary' : 'border-transparent',
        className
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
};

export type KanbanHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  boardId: string;
  column: Column;
  columns: Column[];
  dispatch: (action: Action) => void;
};

export const KanbanHeader = ({ children, boardId, column, columns, dispatch, className, ...props }: KanbanHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(column.title);

  const handleMove = (direction: 'left' | 'right') => {
    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const curIdx = sorted.findIndex(c => c.id === column.id);
    const overIdx = direction === 'left' ? curIdx - 1 : curIdx + 1;

    if (overIdx < 0 || overIdx >= sorted.length) return;

    const STEP = 100;
    const over = sorted[overIdx];
    let newPosition: number;

    if (direction === 'left') {
      const prev = sorted[overIdx - 1];
      newPosition = prev ? (prev.position + over.position) / 2 : (over.position - STEP / 2);
    } else {
      const next = sorted[overIdx + 1];
      newPosition = next ? (over.position + next.position) / 2 : (over.position + STEP / 2);
    }

    dispatch({
      type: 'columns/update',
      payload: { ...column, position: Math.floor(newPosition) },
    });
  };

  const handleUpdateTitle = () => {
    dispatch({
      type: 'columns/updateTitle',
      payload: {
        id: column.id,
        title: newTitle,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className={cn('m-0 font-semibold text-sm p-3 border-0 flex justify-between items-center', className)} {...props}>
      {children}
      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => handleMove('left')}>Move Left</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleMove('right')}>Move Right</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsEditing(true)}>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
          </DialogHeader>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Button onClick={handleUpdateTitle}>Save</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};
