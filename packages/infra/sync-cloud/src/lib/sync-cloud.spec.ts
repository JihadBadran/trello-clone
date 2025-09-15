import { syncCloud } from './sync-cloud.js';

describe('syncCloud', () => {
  it('should work', () => {
    expect(syncCloud()).toEqual('sync-cloud');
  });
});
