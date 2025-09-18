'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanContext, KanbanContextProps, KanbanItemProps } from '@tc/kanban/presentation';
import { Card } from '@tc/uikit/components/ui/card';
import { ScrollArea } from '@tc/uikit/components/ui/scroll-area';
import { ScrollBar } from '@tc/uikit/components/ui/scroll-area';
import { cn } from '@tc/uikit/lib/utils';
import { HTMLAttributes, ReactNode, useContext } from 'react';
import { SortableContext } from '@dnd-kit/sortable';

export type KanbanCardProps<T extends KanbanItemProps = KanbanItemProps> = T & {
  children?: ReactNode;
  className?: string;
};

export const KanbanCard = <T extends KanbanItemProps = KanbanItemProps>({
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
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div style={style} {...listeners} {...attributes} ref={setNodeRef}>
      <Card
        className={cn(
          'cursor-grab gap-4 rounded-md p-3 shadow-sm',
          isDragging && 'pointer-events-none cursor-grabbing opacity-30',
          className
        )}
      >
        {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
      </Card>
    </div>
  );
};

export type KanbanCardsProps<T extends KanbanItemProps = KanbanItemProps> =
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'id'> & {
    children: (item: T) => ReactNode;
    id: string;
  };

export const KanbanCards = <T extends KanbanItemProps = KanbanItemProps>({
  children,
  className,
  ...props
}: KanbanCardsProps<T>) => {
  const { data } = useContext(KanbanContext) as KanbanContextProps<T>;
  const filteredData = data.filter((item) => item.column === props.id);
  const items = filteredData.map((item) => item.id);
  return (
    <ScrollArea className="overflow-hidden flex-1">
      <SortableContext items={items}>
        <div
          className={cn('flex flex-grow flex-col gap-2 p-2', className)}
          {...props}
        >
          {filteredData.map(children)}
        </div>
      </SortableContext>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};
