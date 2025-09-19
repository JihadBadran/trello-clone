'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@tc/uikit/components/ui/card';
import { ScrollArea } from '@tc/uikit/components/ui/scroll-area';
import { ScrollBar } from '@tc/uikit/components/ui/scroll-area';
import { cn } from '@tc/uikit/lib/utils';
import { HTMLAttributes, ReactNode } from 'react';
import { SortableContext } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';

type KanbanItemBase = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

export type KanbanCardProps<T extends KanbanItemBase = KanbanItemBase> = T & {
  children?: ReactNode;
  className?: string;
};

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
    // transition,
    transform,
    isDragging,
  } = useSortable({
    id,
  });

  const style = {
    // transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={style}
      {...listeners}
      {...attributes}
      ref={setNodeRef}
    >
      <Card
        className={cn(
          'cursor-grab gap-4 rounded-md shadow-sm',
          isDragging && 'pointer-events-none cursor-grabbing opacity-30'
          // className
        )}
      >
        <CardHeader className="flex gap-2 items-center">
          <CardTitle>{name}</CardTitle>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export type KanbanCardsProps<T extends KanbanItemBase = KanbanItemBase> =
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    children: (item: T) => ReactNode;
    items: T[];
    columnId: string;
  };

export const KanbanCards = <T extends KanbanItemBase = KanbanItemBase>({
  children,
  className,
  items,
  columnId,
  ...rest
}: KanbanCardsProps<T>) => {
  const filteredData = items.filter((item) => item.column === columnId);
  const sortableIds = filteredData.map((item) => item.id);
  return (
    <ScrollArea className="overflow-hidden flex-1">
      <SortableContext items={sortableIds}>
        <div
          className={cn('flex flex-grow flex-col gap-2 p-2', className)}
          {...rest}
        >
          {filteredData.map(children)}
        </div>
      </SortableContext>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
};
