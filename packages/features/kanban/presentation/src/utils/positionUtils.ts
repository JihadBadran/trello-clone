import type { Card } from '@tc/cards/domain';

const POSITION_STEP = 100;

export const calculateNextCardPosition = (cards: Card[], columnId: string): number => {
  const cardsInColumn = cards
    .filter((card) => card.column_id === columnId && !card.deleted_at)
    .sort((a, b) => a.position - b.position);

  return cardsInColumn.length > 0
    ? cardsInColumn[cardsInColumn.length - 1].position + POSITION_STEP
    : POSITION_STEP;
};

/**
 * Calculate new position based on target index in sorted array
 * Used for drag and drop positioning
 */
export const calculateDragPosition = (
  sortedCards: Array<{ position: number }>,
  targetIndex: number
): number => {
  if (sortedCards.length === 0) {
    return POSITION_STEP;
  }

  if (targetIndex <= 0) {
    return Math.floor(sortedCards[0].position / 2);
  }

  if (targetIndex >= sortedCards.length) {
    return sortedCards[sortedCards.length - 1].position + POSITION_STEP;
  }

  const prevCard = sortedCards[targetIndex - 1];
  const nextCard = sortedCards[targetIndex];
  return Math.floor((prevCard.position + nextCard.position) / 2);
};


/** Compute the smallest gap between adjacent items */
export const getMinGap = <T extends { position: number }>(arr: T[]): number => {
  const s = arr.sort((a, b) => a.position - b.position);
  if (s.length < 2) return Infinity;
  let minGap = Infinity;
  for (let i = 1; i < s.length; i++) {
    const gap = s[i].position - s[i - 1].position;
    if (gap < minGap) minGap = gap;
  }
  return minGap;
}