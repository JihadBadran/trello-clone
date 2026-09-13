import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { tabSync } from 'tab-bridge/zustand';
import type { Session } from '@supabase/supabase-js';
import type { Board } from '@tc/boards/domain';
import type { Column } from '@tc/columns/domain';
import type { Card } from '@tc/cards/domain';
import type { Action } from '@tc/foundation/actions';
import { createAndStartSync } from '@tc/infra/sync-cloud';

// Repo imports for IDB persistence + cloud sync
import { boardsRepoIDB, BoardsRepoIDB, BoardsRepoSupabase } from '@tc/boards/data';
import { columnsRepoIDB, ColumnsRepoIDB, ColumnsRepoSupabase } from '@tc/columns/data';
import { cardsRepoIDB, CardsRepoIDB, CardsRepoSupabase } from '@tc/cards/data';

export type KanbanState = {
  boards: Record<string, Board>;
  columns: Record<string, Column>;
  cards: Record<string, Card>;
  hydrated: boolean;
  activeBoardId: string | null;
  session: Session | null;

  // Actions
  setHydrated: (hydrated: boolean) => void;
  setActiveBoardId: (id: string) => void;
  setSession: (session: Session | null) => void;
  hydrateBoards: (rows: Board[]) => void;
  upsertBoard: (row: Board) => void;
  hydrateColumns: (columns: Column[]) => void;
  upsertColumn: (column: Column) => void;
  removeColumn: (id: string) => void;
  hydrateCards: (cards: Card[]) => void;
  upsertCard: (card: Card) => void;
  removeCard: (id: string) => void;
  moveCard: (cardId: string, targetColumnId: string, position: number, withRepositioning?: boolean) => void;

  // Dispatch for backwards compatibility with presentation layer
  dispatch: (action: Action) => void;
};

export type KanbanStore = KanbanState;

export const makeKanbanStore = () => {
  const store = create<KanbanStore>()(
    devtools(
      persist(
        tabSync(
          (set, get) => ({
            // State
            boards: {},
            columns: {},
            cards: {},
            hydrated: false,
            activeBoardId: null,
            session: null,

            // State setters
            setHydrated: (hydrated) => set({ hydrated }),
            setActiveBoardId: (id) => set({ activeBoardId: id }),
            setSession: (session) => set({ session }),

            // Board actions
            hydrateBoards: (rows) =>
              set({ boards: Object.fromEntries(rows.map((b) => [b.id, b])) }),
            upsertBoard: (row) =>
              set((s) => ({ boards: { ...s.boards, [row.id]: row } })),

            // Column actions
            hydrateColumns: (columns) =>
              set({ columns: Object.fromEntries(columns.map((c) => [c.id, c])) }),
            upsertColumn: (column) =>
              set((s) => ({ columns: { ...s.columns, [column.id]: column } })),
            removeColumn: (id) =>
              set((s) => {
                const { [id]: _, ...rest } = s.columns;
                return { columns: rest };
              }),

            // Card actions
            hydrateCards: (cards) =>
              set({ cards: Object.fromEntries(cards.map((c) => [c.id, c])) }),
            upsertCard: (card) =>
              set((s) => ({ cards: { ...s.cards, [card.id]: card } })),
            removeCard: (id) =>
              set((s) => {
                const { [id]: _, ...rest } = s.cards;
                return { cards: rest };
              }),
            moveCard: (cardId, targetColumnId, position, withRepositioning = false) => {
              if (withRepositioning) {
                const cardsInTargetColumn = Object.values(get().cards).filter(
                  (c) => c.column_id === targetColumnId
                );
                const updatedCards = cardsInTargetColumn.map((c, index) => ({
                  ...c,
                  position: index * 100,
                }));
                updatedCards.forEach((c) => {
                  set((state) => ({
                    cards: { ...state.cards, [c.id]: c },
                  }));
                });
              } else {
                set((state) => {
                  const card = state.cards[cardId];
                  return {
                    cards: {
                      ...state.cards,
                      [cardId]: {
                        ...card,
                        column_id: targetColumnId,
                        position,
                      },
                    },
                  };
                });
              }
            },

            // Dispatch — backwards-compatible action router
            dispatch: (action: Action) => {
              const state = get();
              const now = () => new Date().toISOString();

              switch (action.type) {
                case 'boards/create': {
                  const board = action.payload as Partial<Board>;
                  const full = { ...board, is_archived: false, updated_at: now() } as Board;
                  state.upsertBoard(full);
                  boardsRepoIDB.putLocal(full);
                  boardsRepoIDB.enqueueUpsert(full);
                  BoardsRepoSupabase.upsert(full);
                  break;
                }
                case 'boards/archive': {
                  const { id } = action.payload as { id: string };
                  const b = state.boards[id];
                  if (b) {
                    const archived = { ...b, is_archived: true, updated_at: now() } as Board;
                    state.upsertBoard(archived);
                    boardsRepoIDB.putLocal(archived);
                    boardsRepoIDB.enqueueUpsert(archived);
                    BoardsRepoSupabase.upsert(archived);
                  }
                  break;
                }
                case 'boards/update': {
                  const board = action.payload as Board;
                  const updated = { ...board, updated_at: now() } as Board;
                  state.upsertBoard(updated);
                  boardsRepoIDB.putLocal(updated);
                  boardsRepoIDB.enqueueUpsert(updated);
                  BoardsRepoSupabase.upsert(updated);
                  break;
                }
                case 'columns/create': {
                  const column = action.payload as Column;
                  const full = { ...column, updated_at: now() } as Column;
                  state.upsertColumn(full);
                  columnsRepoIDB.putLocal(full);
                  columnsRepoIDB.enqueueUpsert(full);
                  ColumnsRepoSupabase.upsert(full);
                  break;
                }
                case 'columns/update': {
                  const column = action.payload as Column;
                  const updated = { ...column, updated_at: now() } as Column;
                  state.upsertColumn(updated);
                  columnsRepoIDB.putLocal(updated);
                  columnsRepoIDB.enqueueUpsert(updated);
                  ColumnsRepoSupabase.upsert(updated);
                  break;
                }
                case 'columns/delete': {
                  const { id } = action.payload as { id: string };
                  state.removeColumn(id);
                  columnsRepoIDB.removeLocal(id);
                  columnsRepoIDB.enqueueRemove(id);
                  ColumnsRepoSupabase.remove(id);
                  break;
                }
                case 'columns/updateTitle': {
                  const { id, title } = action.payload as { id: string; title: string };
                  const column = state.columns[id];
                  if (column) {
                    const updated = { ...column, title, updated_at: now() } as Column;
                    state.upsertColumn(updated);
                    columnsRepoIDB.putLocal(updated);
                    columnsRepoIDB.enqueueUpsert(updated);
                    ColumnsRepoSupabase.upsert(updated);
                  }
                  break;
                }
                case 'columns/resequence': {
                  const { columnId, newPosition } = action.payload as {
                    columnId: string;
                    newPosition: number;
                  };
                  const column = state.columns[columnId];
                  if (column) {
                    const updated = {
                      ...column,
                      position: newPosition,
                      updated_at: now(),
                    } as Column;
                    state.upsertColumn(updated);
                    columnsRepoIDB.putLocal(updated);
                    columnsRepoIDB.enqueueUpsert(updated);
                    ColumnsRepoSupabase.upsert(updated);
                  }
                  break;
                }
                case 'cards/upsert': {
                  const card = action.payload as Card;
                  const full = { ...card, updated_at: now() } as Card;
                  state.upsertCard(full);
                  cardsRepoIDB.putLocal(full);
                  cardsRepoIDB.enqueueUpsert(full);
                  CardsRepoSupabase.upsert(full);
                  break;
                }
                case 'cards/delete': {
                  const { id } = action.payload as { id: string };
                  state.removeCard(id);
                  cardsRepoIDB.removeLocal(id);
                  cardsRepoIDB.enqueueRemove(id);
                  CardsRepoSupabase.remove(id);
                  break;
                }
                case 'cards/move': {
                  const { cardId, targetColumnId, position, withRepositioning } = action.payload as {
                    cardId: string;
                    targetColumnId: string;
                    position: number;
                    withRepositioning?: boolean;
                  };
                  state.moveCard(cardId, targetColumnId, position, withRepositioning);
                  // Persist all affected cards
                  const afterMove = get().cards;
                  if (withRepositioning) {
                    const affected = Object.values(afterMove).filter(
                      (c) => c.column_id === targetColumnId
                    );
                    affected.forEach((c) => {
                      const updated = { ...c, updated_at: now() } as Card;
                      cardsRepoIDB.putLocal(updated);
                      cardsRepoIDB.enqueueUpsert(updated);
                      CardsRepoSupabase.upsert(updated);
                    });
                  } else {
                    const card = afterMove[cardId];
                    if (card) {
                      const updated = { ...card, updated_at: now() } as Card;
                      cardsRepoIDB.putLocal(updated);
                      cardsRepoIDB.enqueueUpsert(updated);
                      CardsRepoSupabase.upsert(updated);
                    }
                  }
                  break;
                }
              }
            },
          }),
          {
            channel: 'tc-kanban',
            // Only sync data fields — exclude functions, session, hydrated
            exclude: [
              'hydrated',
              'activeBoardId',
              'session',
              'setHydrated',
              'setActiveBoardId',
              'setSession',
              'hydrateBoards',
              'upsertBoard',
              'hydrateColumns',
              'upsertColumn',
              'removeColumn',
              'hydrateCards',
              'upsertCard',
              'removeCard',
              'moveCard',
              'dispatch',
            ],
            onSyncReady: (instance) => {
              // Start cloud sync when this tab becomes leader
              let stopCloudSync: (() => void) | null = null;
              instance.onLeader(() => {
                if (!stopCloudSync) {
                  stopCloudSync = createAndStartSync({
                    channels: {
                      boards: { topic: 'boards', local: new BoardsRepoIDB(), cloud: BoardsRepoSupabase },
                      columns: { topic: 'columns', local: new ColumnsRepoIDB(), cloud: ColumnsRepoSupabase },
                      cards: { topic: 'cards', local: new CardsRepoIDB(), cloud: CardsRepoSupabase },
                    },
                  });
                }
                return () => {
                  stopCloudSync?.();
                  stopCloudSync = null;
                };
              });
            },
          }
        ),
        {
          name: 'kanban-store',
          // Only persist data fields
          partialize: (state) => ({
            boards: state.boards,
            columns: state.columns,
            cards: state.cards,
          }),
        }
      ),
      { name: 'KanbanStore', enabled: true }
    )
  );

  return store;
};
