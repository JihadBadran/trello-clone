import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { createBrowserHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { registerSW } from 'virtual:pwa-register'
import { routeTree } from './routeTree.gen';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

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

registerSW({ immediate: true, onOfflineReady: () => alert('App is ready to work offline!') })

root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
