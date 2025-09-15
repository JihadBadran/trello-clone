import { createRoute } from '@tanstack/react-router';
import { RootRoute } from './__root';
import { BoardsFeature } from '@tc/prez-boards';
import { BoardsRepoIDB } from '@tc/infra/idb';
const BoardLayout = () => (
  <div>
    <BoardsFeature repo={BoardsRepoIDB} />
  </div>
);

const BoardRoute = createRoute({
  path: '/boards/:boardId',
  getParentRoute: () => RootRoute,
  component: BoardLayout,
});

export default BoardRoute;
