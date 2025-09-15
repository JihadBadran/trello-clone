import type { BoardsRepo } from '@tc/application-boards'
import { BoardsProvider } from '@tc/application-boards-react'
import { BoardsList } from './BoardList'

export function BoardsFeature({ repo }: { repo: BoardsRepo }) {
  return (
    <BoardsProvider repo={repo}>
      <BoardsList />
    </BoardsProvider>
  )
}