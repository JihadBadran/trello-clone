import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{' '}
      <Link to="/boards/:boardId" className="[&.active]:font-bold">
        Boards
      </Link>
    </div>
    <hr />
    <Outlet />
  </>
);

export const RootRoute = createRootRoute({ component: RootLayout });
