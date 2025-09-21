import { useCallback } from 'react';
import type { 
  CollisionDetection, 
  UniqueIdentifier,
  DroppableContainer 
} from '@dnd-kit/core';
import { 
  closestCenter, 
  pointerWithin, 
  rectIntersection, 
  getFirstCollision 
} from '@dnd-kit/core';
import type { Items } from '../utils/containerUtils';

interface UseCollisionDetectionProps {
  activeId: UniqueIdentifier | null;
  items: Items;
  lastOverId: React.MutableRefObject<UniqueIdentifier | null>;
  recentlyMovedToNewContainer: React.MutableRefObject<boolean>;
}

export const useCollisionDetection = ({
  activeId,
  items,
  lastOverId,
  recentlyMovedToNewContainer,
}: UseCollisionDetectionProps): CollisionDetection => {
  return useCallback(
    (args) => {
      // Handle container-level dragging
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          ),
        });
      }

      // Find intersecting droppables
      const pointerIntersections = pointerWithin(args);
      const intersections = pointerIntersections.length > 0 
        ? pointerIntersections 
        : rectIntersection(args);
      
      let overId = getFirstCollision(intersections, 'id');

      if (overId != null) {
        // Handle container intersections
        if (overId in items) {
          const containerItems = items[overId];

          if (containerItems.length > 0) {
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container: DroppableContainer) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Handle recent container moves
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items, lastOverId, recentlyMovedToNewContainer]
  );
};
