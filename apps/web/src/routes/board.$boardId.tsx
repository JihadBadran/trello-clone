import { createFileRoute, redirect } from '@tanstack/react-router';
import { KanbanBoard } from '@tc/kanban/presentation';
import { supabase } from '@tc/infra/supabase';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from '@tc/uikit/icons';
import { Button } from '@tc/uikit/components/ui/button';

const BoardPage = () => {
  const { boardId } = Route.useParams();
  return (
    <div className="flex flex-1 flex-col">
      <Link to="/boards" className='text-primary flex items-center mx-6 w-fit'>
        <Button variant={"link"} className='justify-start px-0'><ArrowLeft /> Back to boards</Button>
      </Link>

      <KanbanBoard boardId={boardId} />
    </div>
  );
};

export const Route = createFileRoute('/board/$boardId')({
  component: BoardPage,
  async beforeLoad() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
          throw redirect({ to: '/auth' }); // Redirect to login if not authenticated
      }
    },
});
