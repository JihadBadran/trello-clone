export type ColumnCreated = {
  type: 'ColumnCreated';
  v: 1;
  at: string;
  column: { id: string; boardId: string; title: string; position: number };
};

export type ColumnMoved = {
  type: 'ColumnMoved';
  v: 1;
  at: string;
  id: string;
  to: { position: number };
};

export type ColumnRenamed = {
  type: 'ColumnRenamed';
  v: 1;
  at: string;
  id: string;
  title: string;
};