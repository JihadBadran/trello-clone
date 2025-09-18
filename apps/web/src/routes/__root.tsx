import '../styles.css';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { KanbanProvider } from '@tc/kanban/application-react';
import { SidebarInset, SidebarProvider } from '@tc/uikit/components/ui/sidebar';
import { Kanban } from '@tc/uikit/icons';

const RootLayout = () => (
  <KanbanProvider>
    <SidebarProvider>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 z-30 bg-accent mb-6">
          <Kanban className="size-8" />
          <h1 className="text-xl font-bold">
            TRELLO
          </h1>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  </KanbanProvider>
);

export const Route = createRootRoute({ component: RootLayout });
