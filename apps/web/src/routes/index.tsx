import { createRoute } from '@tanstack/react-router'
import App from '../app/app'
import { RootRoute } from './__root';

const MainRoute = createRoute({
  path: '/',
  getParentRoute: () => RootRoute,
  component: App,
});

export default MainRoute;