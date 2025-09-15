export type Intent = { type: 'BOARD_UPSERTED'; payload: any };
type Handler = (i: Intent) => void;

export class BroadcastBus {
  private bc = new BroadcastChannel('trello-clone');
  on(h: Handler) { this.bc.onmessage((e: any) => h(e.data as Intent)); }
  post(i: Intent) { this.bc.postMessage(i); }
  close() { this.bc.close(); }
}