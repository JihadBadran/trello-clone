import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { createBrowserHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { RootRoute } from './routes/__root';
import MainRoute from './routes';
import BoardRoute from './routes/board';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const routeTree = RootRoute.addChildren([MainRoute, BoardRoute])

// Create a new router instance
const router = createRouter({
  history: createBrowserHistory(),
  routeTree,
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
