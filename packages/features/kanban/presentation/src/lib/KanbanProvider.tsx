'use client';
import type {
  Announcements,
  DndContextProps,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  createContext,
  type ReactNode,
  useState,
  useContext,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { t } from '@tc/infra/dnd';
export type { DragEndEvent } from '@dnd-kit/core';

export type KanbanItemProps = {
  id: string;
  name: string;
  column: string;
} & Record<string, unknown>;

export type KanbanColumnProps = {
  id: string;
  name: string;
} & Record<string, unknown>;

export type KanbanContextProps<T extends KanbanItemProps = KanbanItemProps, C extends KanbanColumnProps = KanbanColumnProps> = {
  columns: C[];
  data: T[];
  activeCardId: string | null;
  dropHint: { overId: string | null; place: 'before' | 'after' | null; columnId: string | null } | null;
};

export const KanbanContext = createContext<KanbanContextProps>({ columns: [], data: [], activeCardId: null, dropHint: null });

export const useDndKanban = () => useContext(KanbanContext as any);

export type KanbanProviderProps<
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
> = Omit<DndContextProps, 'children'> & {
  children: (column: C) => ReactNode;
  className?: string;
  columns: C[];
  data: T[];
  onDataChange?: (data: T[]) => void;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
};

export const KanbanProvider = <
  T extends KanbanItemProps = KanbanItemProps,
  C extends KanbanColumnProps = KanbanColumnProps,
>({
  children,
  onDragStart,
  onDragEnd,
  onDragOver,
  className,
  columns,
  data,
  onDataChange,
  ...props
}: KanbanProviderProps<T, C>) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null);
  const [dropHint, setDropHint] = useState<{ overId: string | null; place: 'before' | 'after' | null; columnId: string | null } | null>(null);
  const [internalData, setInternalData] = useState<T[]>(data);

  // keep internal data in sync with props when not dragging
  useEffect(() => {
    if (!activeCardId) setInternalData(data);
  }, [data, activeCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
    const rect = event.active.rect.current.translated || event.active.rect.current.initial;
    if (rect) {
      setActiveSize({ width: rect.width, height: rect.height });
    }
    onDragStart?.(event);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeItem = data.find((item) => item.id === active.id);
    const overItem = data.find((item) => item.id === over.id);
    if (!(activeItem)) {
      return;
    }
    const activeColumn = activeItem.column;
    const overColumn =
      overItem?.column ||
      columns.find(col => col.id === over.id)?.id ||
      columns[0]?.id;
    if (activeColumn !== overColumn) {
      setInternalData((prev) => {
        if (!overColumn) return prev;
        const newData = [...prev];
        const activeIndex = newData.findIndex((item) => item.id === active.id);
        if (activeIndex >= 0) newData[activeIndex] = { ...(newData[activeIndex] as any), column: overColumn } as T;
        return newData;
      });
    }
    // Compute drop hint (position indicator) using rect midpoints like docs
    const activeRect = event.active.rect.current.translated || event.active.rect.current.initial;
    const overRect = over?.rect;
    const isAfter = overItem && activeRect && overRect
      ? (activeRect.top + activeRect.height / 2) > (overRect.top + overRect.height / 2)
      : true;
    const place: 'before' | 'after' = overItem ? (isAfter ? 'after' : 'before') : 'after';
    const columnId = overItem ? overItem.column : (columns.find(col => col.id === over.id)?.id || null);
    setDropHint({ overId: overItem?.id ?? null, place, columnId });
    onDragOver?.(event);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null);
    setActiveSize(null);
    setDropHint(null);
    onDragEnd?.(event);
    // If consumer provides an onDragEnd handler, assume it will update data via actions.
    // Avoid doing local reordering here to prevent conflicts.
    if (onDragEnd) {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    let newData = [...internalData];
    const oldIndex = newData.findIndex((item) => item.id === active.id);
    const newIndex = newData.findIndex((item) => item.id === over.id);
    newData = arrayMove(newData, oldIndex, newIndex);
    setInternalData(newData as T[]);
  };

  const announcements: Announcements = {
    onDragStart({ active }) {
      const { name, column } = internalData.find((item) => item.id === active.id) ?? {};
      return `Picked up the card "${name}" from the "${column}" column`;
    },
    onDragOver({ active, over }) {
      const { name } = internalData.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;
      return `Dragged the card "${name}" over the "${newColumn}" column`;
    },
    onDragEnd({ active, over }) {
      const { name } = internalData.find((item) => item.id === active.id) ?? {};
      const newColumn = columns.find((column) => column.id === over?.id)?.name;
      return `Dropped the card "${name}" into the "${newColumn}" column`;
    },
    onDragCancel({ active }) {
      const { name } = internalData.find((item) => item.id === active.id) ?? {};
      return `Cancelled dragging the card "${name}"`;
    },
  };

  return (
    <KanbanContext.Provider value={{ columns, data: internalData, activeCardId, dropHint }}>
      <DndContext
        accessibility={{ announcements }}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
        {...props}
      >
        <div className='flex-1 flex flex-row w-full gap-4 py-2 px-6'>
          {columns.map((column) => children(column))}
        </div>
        {typeof window !== 'undefined' &&
          createPortal(
            <DragOverlay>
              <div style={{ width: activeSize?.width, height: activeSize?.height }} className="opacity-90">
                <t.Out />
              </div>
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </KanbanContext.Provider>
  );
};
