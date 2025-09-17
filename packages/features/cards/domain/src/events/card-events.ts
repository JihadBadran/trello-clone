export type CardCreated = {
  type: 'CardCreated';
  v: number;
  at: string;
  card: { id: string; columnId: string; title: string; position: number };
};

export type CardMoved = {
  type: 'CardMoved';
  v: number;
  at: string;
  id: string;
  to: { columnId: string; position: number };
};

export type CardUpdated = {
  type: 'CardUpdated';
  v: number;
  at: string;
  id: string;
  patch: Partial<{ title: string; position: number }>;
};