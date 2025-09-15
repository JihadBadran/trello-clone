// Brand helper
export type Brand<K, T> = K & { __brand: T };

export type UserId   = Brand<string, 'UserId'>;
export type BoardId  = Brand<string, 'BoardId'>;
export type ColumnId = Brand<string, 'ColumnId'>;
export type CardId   = Brand<string, 'CardId'>;