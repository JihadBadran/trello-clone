import type { BoardsRepo, BoardsStore } from '@tc/application-boards';
import { createBoardsStore } from '@tc/application-boards';
import { createContext, useContext, useMemo } from 'react';
import { useStore } from 'zustand';

const Ctx = createContext<BoardsStore | null>(null);

export function BoardsProvider({ children, repo }: { children: React.ReactNode; repo: BoardsRepo }) {
  const store = useMemo(() => createBoardsStore({ local: repo }), [repo]);
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
export function useBoards<T>(selector: (s: ReturnType<BoardsStore['getState']>) => T) {
  const store = useContext(Ctx);
  if (!store) throw new Error('useBoards must be used within <BoardsProvider>');
  return useStore(store, selector);
}