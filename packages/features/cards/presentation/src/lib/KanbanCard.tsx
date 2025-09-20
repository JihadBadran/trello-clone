'use client';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { t } from '@tc/infra/dnd';
import {
  CardContent,
  CardHeader,
  CardTitle
} from '@tc/uikit/components/ui/card';
import { ScrollArea, ScrollBar } from '@tc/uikit/components/ui/scroll-area';
import { cn } from '@tc/uikit/lib/utils';
import { HTMLAttributes, ReactNode } from 'react';

type KanbanItemBase = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

export type KanbanCardProps<T extends KanbanItemBase = KanbanItemBase> = T & {
  children?: ReactNode;
  className?: string;
};

const CardInner = ({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) => (
  <>
    <CardHeader className="flex gap-2 items-center">
      <CardTitle>{name}</CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </>
);

export const KanbanCard = <T extends KanbanItemBase = KanbanItemBase>({
  id,
  name,
  children,
  className,
}: KanbanCardProps<T>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transition,
    transform,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    transition: transition ? transition.toString() : undefined,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  const content = <CardInner name={name}>{children}</CardInner>;

  return (
    <div
      ref={setNodeRef}
      className={cn('cursor-grab gap-4 rounded-md shadow-sm px-4 py-6', className)}
      style={style}
      {...listeners}
      {...attributes}
    >
      {content}
      {isDragging && (
        <t.In>
          <div className={cn('rounded-md shadow-sm px-4 py-6 bg-secondary')}>{content}</div>
        </t.In>
      )}
    </div>
  );
};

export type DropHint = {
  overId: string | null;
  place: 'before' | 'after' | null;
  columnId: string | null;
} | null;

export type KanbanCardsProps<T extends KanbanItemBase = KanbanItemBase> = Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> & {
  children: (item: T) => ReactNode;
  items: T[];
  columnId: string;
  dropHint?: DropHint;
};

export const KanbanCards = <T extends KanbanItemBase = KanbanItemBase>({
  children,
  className,
  items,
  columnId,
  dropHint,
  ...rest
}: KanbanCardsProps<T>) => {
  const filteredData = items.filter((item) => item.column === columnId);
  const sortableIds = filteredData.map((item) => item.id);
  return (
    <ScrollArea className="overflow-hidden flex-1">
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={cn('flex flex-grow flex-col gap-2 p-2', className)}
          {...rest}
        >
          {filteredData.map((item) => (
            children(item)
          ))}
        </div>
      </SortableContext>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};
