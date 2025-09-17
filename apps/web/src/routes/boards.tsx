import { createRoute } from '@tanstack/react-router';
import { RootRoute } from './__root';
import { BoardsFeature } from '@tc/boards/presentation';

const BoardsRoute = createRoute({
  path: '/boards',
  getParentRoute: () => RootRoute,
  component: BoardsFeature,
});

export default BoardsRoute;
