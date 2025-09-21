import { useState } from 'react';
import { Dialog } from '@radix-ui/react-dialog';
import { BoardCollaborators, InviteMemberForm } from '@tc/boards/presentation';
import { CreateColumnForm } from '@tc/columns/presentation';
import { Button } from '@tc/uikit';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@tc/uikit/components/ui/dialog';
import { Columns3Cog, User, RefreshCw } from '@tc/uikit/icons';

interface BoardActionButtonsProps {
  boardId: string;
  onRefresh: () => Promise<void>;
}

export const BoardActionButtons = ({ boardId, onRefresh }: BoardActionButtonsProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  return (
    <div className="flex-shrink-0 gap-3 flex items-center">
      <div className="flex-1">
        <BoardCollaborators boardId={boardId} />
      </div>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="default">
            <Columns3Cog className="size-4" />
            Column
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Column</DialogTitle>
          </DialogHeader>
          <CreateColumnForm boardId={boardId} />
        </DialogContent>
      </Dialog>

      <Button
        variant="default"
        disabled={isRefreshing}
        onClick={handleRefresh}
      >
        <RefreshCw
          className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="default">
            <User className="size-4" />
            Collaborate
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
          </DialogHeader>
          <InviteMemberForm boardId={boardId} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
