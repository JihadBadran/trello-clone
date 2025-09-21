'use client';
import { UniqueIdentifier, useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@tc/uikit/components/ui/card';
import { cn } from '@tc/uikit/lib/utils';
import { HTMLAttributes, ReactNode } from 'react';

type KanbanItemBase = {
  id: UniqueIdentifier;
  name: string;
  column: UniqueIdentifier;
  position?: number | string;
} & Record<string, unknown>;

export type KanbanCardProps<T extends KanbanItemBase = KanbanItemBase> = T & {
  children?: ReactNode;
  className?: string;
};

export const KanbanCard = <T extends KanbanItemBase = KanbanItemBase>({
  name,
  children,
  className,
}: KanbanCardProps<T>) => {
  return (
    <Card
      className={cn(
        `cursor-grab gap-4 rounded-md shadow-sm px-4 py-6`,
        className
      )}
    >
      <CardHeader className="flex gap-2 items-center">
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export type KanbanCardsProps<T extends KanbanItemBase = KanbanItemBase> = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  children: (item: T) => ReactNode;
  items: T[];
  columnId: UniqueIdentifier;
};

export const KanbanCards = <T extends KanbanItemBase = KanbanItemBase>({
  children,
  items,
  columnId,
}: KanbanCardsProps<T>) => {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  // Filter and sort cards by position
  const filteredData = items
    .filter((item) => item.column === columnId)
    .sort((a, b) => {

      const posA = typeof a.position === 'number' ? a.position : parseInt(a.position as string, 10) || 0;
      const posB = typeof b.position === 'number' ? b.position : parseInt(b.position as string, 10) || 0;
      return posA - posB;
    });

  // Extract IDs in sorted order for SortableContext
  const sortableIds = filteredData.map((item) => item.id);

  return (
    <div className={cn("flex flex-grow flex-col gap-2 p-2", isOver ? 'opacity-50' : 'opacity-100')} ref={setNodeRef}>
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {filteredData.map((item) => children(item))}
      </SortableContext>
    </div>
  );
};
