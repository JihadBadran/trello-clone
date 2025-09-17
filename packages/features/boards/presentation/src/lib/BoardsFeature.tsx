import { BoardsList } from './BoardList'
import { BoardsProvider } from "@tc/boards/application-react";

export function BoardsFeature() {
  return (
    <BoardsProvider>
      <BoardsList />
    </BoardsProvider>
  )
}