import type { UniqueIdentifier } from '@dnd-kit/core';

export type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;

export const findContainer = (id: UniqueIdentifier, items: Items): UniqueIdentifier | undefined => {
  if (id in items) {
    return id;
  }
  return Object.keys(items).find((key) => items[key].includes(id));
};

export const getItemIndex = (id: UniqueIdentifier, items: Items): number => {
  const container = findContainer(id, items);
  
  if (!container) {
    return -1;
  }
  
  return items[container].indexOf(id);
};

export const isDroppableContainer = (id: UniqueIdentifier, items: Items): boolean => {
  return id in items;
};
