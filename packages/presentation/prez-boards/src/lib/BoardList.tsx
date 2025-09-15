import { useEffect } from 'react';
import { useBoards } from '@tc/application-boards-react';
import { Button } from '@tc/uikit/components/ui/button';

export function BoardsList() {
  const boards = useBoards((s) => s.boards);
  const hydrate = useBoards((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="p-6 space-y-4 bg-amber-50">
      <div className="text-lg font-semibold">Boards</div>
      <ul className="space-y-2">
        {boards.map((b) => (
          <li key={b.id} className="p-3 rounded border">
            {b.title}
          </li>
        ))}
      </ul>
      <Button onClick={() => alert("What is this?")}>New board</Button>
    </div>
  );
}
