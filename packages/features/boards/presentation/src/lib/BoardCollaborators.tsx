import { useBoardMembers } from '@tc/boards/application-react';
import { Avatar, AvatarFallback, AvatarImage } from '@tc/uikit';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@tc/uikit';

export const BoardCollaborators = ({ boardId }: { boardId: string }) => {
  const members = useBoardMembers(boardId);

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {members.map(member => (
          <Tooltip key={member.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src={member.avatar_url || ''} alt={member.full_name || ''} />
                <AvatarFallback>{member.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{member.email}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
