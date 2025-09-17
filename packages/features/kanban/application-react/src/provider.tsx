import React from 'react';
import { KanbanProviderInternal } from './hooks';

/**
 * The public-facing Kanban provider.
 * It wraps the internal provider which contains the store creation and hook logic.
 */
export const KanbanProvider = ({ children }: { children: React.ReactNode }) => {
  return <KanbanProviderInternal>{children}</KanbanProviderInternal>;
};
