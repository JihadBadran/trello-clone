import { cn } from '@tc/uikit';
import React from 'react';
import { KanbanIcon } from '@tc/uikit/icons';

export type BoardsEmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export function BoardsEmptyState({
  title = 'No boards yet',
  description = 'Create your first board to get started.',
  className,
  children,
}: BoardsEmptyStateProps) {
  return (
    <div
      className={cn([
        'flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-lg p-6',
        className,
      ])}
    >
      <KanbanIcon className="h-12 w-12 text-muted-foreground" />
      <div className="text-base font-medium text-foreground">{title}</div>
      <div className="text-sm mt-1">{description}</div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default BoardsEmptyState;
