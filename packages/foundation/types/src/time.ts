import { Brand } from "./ids.js";

export type ISODateTime = Brand<string, 'ISODateTime'>;

/**
 * Last-Write-Wins clock
 */
export type LwwClock = {
  updatedAt: ISODateTime; // ISO string
  clientId: string;       // stable per device/browser
  seq: number;            // per-client monotonic counter
};