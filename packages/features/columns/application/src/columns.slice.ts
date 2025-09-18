import type { StateCreator } from 'zustand';
import { compareLww as compareLwwCamelCase } from '@tc/foundation/utils';
import { Column } from '@tc/columns/domain';

const compareLww = (a: Column, b: Column) =>
  compareLwwCamelCase(
    { ...a, updatedAt: a.updated_at },
    { ...b, updatedAt: b.updated_at },
  );

export type ColumnsSlice = {
  columns: Record<string, Column>;
  hydrateColumns: (rows: Column[]) => void;
  upsertColumn: (row: Column) => void;
  removeColumn: (id: string) => void;
};

export const createColumnsSlice: StateCreator<ColumnsSlice, [], [], ColumnsSlice> = (set) => ({
  columns: {},
  hydrateColumns: (rows) =>
    set((s) => {
      const next = { ...s.columns };
      for (const r of rows) {
        if (r.deleted_at) continue;
        const cur = s.columns[r.id];
        if (!cur || compareLww(cur, r) < 0) {
          next[r.id] = r;
        }
      }
      return { columns: next };
    }),
  upsertColumn: (row) =>
    set((s) => {
      if (row.deleted_at) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [row.id]: _removed, ...rest } = s.columns;
        return { columns: rest };
      }
      const cur = s.columns[row.id];
      if (!cur || compareLww(cur, row) < 0) {
        return { columns: { ...s.columns, [row.id]: row } };
      }
      return s;
    }),
  removeColumn: (id) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = s.columns;
      return { columns: rest };
    }),
});