import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@tc/uikit/ui/button';
import { Input } from '@tc/uikit/ui/input';
import { useBoardsList, useCreateBoard } from '@tc/boards/application-react';
import { nanoid } from 'nanoid';
import { Card, CardContent, CardHeader, CardTitle } from '@tc/uikit/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@tc/uikit/ui/dialog';
import { SupabaseAuthClient } from '@supabase/supabase-js/dist/module/lib/SupabaseAuthClient';
import { supabase } from '@tc/infra/supabase';

export function BoardsList() {
  const boards = useBoardsList({ includeArchived: false });
  const createBoard = useCreateBoard();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  async function onCreate() {
    if (!title.trim()) return;
    // get user uid with supabase
    const { data: user } = await supabase.auth.getUser();
    createBoard({
      id: nanoid(),
      title,
      ownerId: user?.user?.id ?? '',
    });
    setTitle('');
    setOpen(false);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Boards</h1>
        <Button onClick={() => setOpen(true)}>New board</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New board</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 items-end justify-end">
            <Input
              placeholder="Board title"
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              className="w-full"
            />
            <div className='flex gap-3 justify-end'>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((b: import('@tc/boards/domain').Board) => (
          <Link key={b.id} to={`/boards/${b.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{b.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Created at {b.created_at}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
