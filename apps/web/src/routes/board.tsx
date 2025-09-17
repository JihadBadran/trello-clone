import { createRoute } from '@tanstack/react-router';
import { RootRoute } from './__root';
import { KanbanBoard } from '@tc/kanban/presentation';

const BoardPage = () => {
  const { boardId } = BoardRoute.useParams();
  return (
    <div className="p-6">
      <KanbanBoard boardId={boardId} />
    </div>
  );
};

const BoardRoute = createRoute({
  path: '/boards/$boardId',
  getParentRoute: () => RootRoute,
  component: BoardPage,
});

export default BoardRoute;
