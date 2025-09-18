import React from 'react';

export type CardsEmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
};

export function CardsEmptyState({
  title = 'No cards here',
  description = 'Create a card to start tracking work in this column.',
  className,
  children,
}: CardsEmptyStateProps) {
  return (
    <div className={[
      'flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-lg p-6',
      className,
    ].filter(Boolean).join(' ')}>
      <div className="text-base font-medium text-foreground">{title}</div>
      <div className="text-sm mt-1">{description}</div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default CardsEmptyState;
