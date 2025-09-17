import '../styles.css';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { KanbanProvider } from '@tc/kanban/application-react';
import {
  SidebarInset,
  SidebarProvider,
} from '@tc/uikit/components/ui/sidebar';
import { CircuitBoard } from '@tc/uikit/lib/index';
import { Button } from '@tc/uikit/components/ui/button';

const RootLayout = () => (
  <KanbanProvider>
    <SidebarProvider>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-6 border-b px-6">
          <div className="text-xl font-bold">TRELLO</div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  </KanbanProvider>
);

export const RootRoute = createRootRoute({ component: RootLayout });
