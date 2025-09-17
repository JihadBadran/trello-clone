import type { StateCreator } from 'zustand'
import { compareLww } from '@tc/foundation/utils'
import type { Column } from './ports'

export type ColumnsSlice = {
  columns: Record<string, Column>
  hydrateColumns: (rows: Column[]) => void
  upsertColumn: (row: Column) => void
  removeColumn: (id: string) => void
}

export const createColumnsSlice: StateCreator<ColumnsSlice, [], [], ColumnsSlice> = (set) => ({
  columns: {},
  hydrateColumns: (rows) => set(s => {
    const next = { ...s.columns }
    for (const r of rows) if (!r.deletedAt) next[r.id] = r
    return { columns: next }
  }),
  upsertColumn: (row) => set(s => {
    if (row.deletedAt) {
      const { [row.id]: _, ...rest } = s.columns; return { columns: rest }
    }
    const cur = s.columns[row.id]
    if (!cur || compareLww(cur, row) < 0) return { columns: { ...s.columns, [row.id]: row } }
    return s
  }),
  removeColumn: (id) => set(s => {
    const { [id]: _, ...rest } = s.columns; return { columns: rest }
  })
})