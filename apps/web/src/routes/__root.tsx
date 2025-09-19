import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { UserMenu } from '@tc/auth';
import { SidebarInset, SidebarProvider } from '@tc/uikit/components/ui/sidebar';
import { Kanban } from '@tc/uikit/icons';
import '../styles.css';
import { KanbanProvider } from '@tc/kanban/application-react';

const RootLayout = () => {
  const navigate = useNavigate();
  return (
    <KanbanProvider>
      <SidebarProvider>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-6 sticky top-0 z-30 bg-accent mb-6">
            <div className="flex items-center gap-2 flex-1">
              <Kanban className="size-8" />
              <h1 className="text-xl font-bold">TRELLO</h1>
            </div>
            <UserMenu
              onLogout={() => {
                navigate({ to: '/auth' });
              }}
            />
          </header>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </KanbanProvider>
  );
};

export const Route = createRootRoute({ component: RootLayout });
