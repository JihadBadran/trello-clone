import { createRoute, redirect } from '@tanstack/react-router';
import { RootRoute } from './__root';

const MainRoute = createRoute({
  path: '/',
  getParentRoute: () => RootRoute,
  beforeLoad: () => {
    throw redirect({
      to: '/boards',
    });
  },
});

export default MainRoute;