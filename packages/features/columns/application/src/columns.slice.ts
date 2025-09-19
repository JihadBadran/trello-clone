import { Column } from '@tc/columns/domain';
import { StateCreator } from 'zustand';

export type ColumnsSlice = {
  columns: Record<string, Column>;
  hydrateColumns: (columns: Column[]) => void;
  upsertColumn: (column: Column) => void;
  removeColumn: (id: string) => void;
};

export const createColumnsSlice: StateCreator<ColumnsSlice, [], [], ColumnsSlice> = (set) => ({
  columns: {},
  hydrateColumns: (columns: Column[]) =>
    set({
      columns: Object.fromEntries(columns.map((c) => [c.id, c])),
    }),
  upsertColumn: (column: Column) =>
    set((state) => ({
      columns: { ...state.columns, [column.id]: column },
    })),
  removeColumn: (id: string) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.columns;
      return { columns: rest };
    }),
});