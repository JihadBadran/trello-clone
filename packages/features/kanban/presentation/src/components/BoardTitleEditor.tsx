import { useState, useEffect } from 'react';
import { Dialog } from '@radix-ui/react-dialog';
import { Button, Input } from '@tc/uikit';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@tc/uikit/components/ui/dialog';
import { Edit } from '@tc/uikit/icons';
import type { Board } from '@tc/boards/domain';
import type { Action } from '@tc/foundation/actions';

interface BoardTitleEditorProps {
  board: Board;
  isOwner: boolean;
  onUpdateTitle: (action: Action) => void;
}

export const BoardTitleEditor = ({ board, isOwner, onUpdateTitle }: BoardTitleEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(board.title);

  useEffect(() => {
    setTitle(board.title);
  }, [board.title]);

  const handleSave = () => {
    onUpdateTitle({
      type: 'boards/update',
      payload: { ...board, title },
    });
    setIsEditing(false);
  };

  if (!isOwner) {
    return <span>{board.title}</span>;
  }

  return (
    <>
      <span>{board.title}</span>
      <Edit
        className="h-4 w-4 cursor-pointer"
        onClick={() => setIsEditing(true)}
      />
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Board Title</DialogTitle>
          </DialogHeader>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};
