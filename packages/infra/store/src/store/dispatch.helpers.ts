import type { Action, ActionImpl } from '@tc/foundation/actions';

/**
 * Attempts to push the action directly to the cloud if a `toCloud` handler exists and the user is online.
 * This is the 'eager' part of the sync strategy.
 * @returns `true` if the push was successful or not needed, `false` if it failed and requires fallback.
 */
async function tryEagerCloudPush<A extends Action, Ctx>(
  handler: ActionImpl<A, Ctx>,
  ctx: Ctx,
  actionWithMeta: A,
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine && handler.toCloud) {
    try {
      await handler.toCloud(ctx, actionWithMeta);
      // If the cloud push is successful, we are done. No need to enqueue.
      return true;
    } catch (error) {
      console.error(`[${actionWithMeta.type}] toCloud failed, falling back to outbox:`, error);
      // Fall through to the outbox mechanism on failure.
      return false;
    }
  }
  // Not online or no toCloud handler, so fallback is required.
  return false;
}

/**
 * Orchestrates the persistence and synchronization of an action.
 * It first persists the change locally, then attempts an eager push to the cloud.
 * If the cloud push fails or is not possible, it falls back to enqueueing the action in the outbox.
 */
export async function handlePersistence<A extends Action, Ctx>(
  handler: ActionImpl<A, Ctx>,
  ctx: Ctx,
  actionWithMeta: A,
) {
  // Always persist to local DB first for data integrity.
  if (handler.toPersist) {
    await handler.toPersist(ctx, actionWithMeta);
  }

  // Attempt to push to the cloud eagerly.
  const cloudPushSucceeded = await tryEagerCloudPush(handler, ctx, actionWithMeta);

  // If the cloud push was successful, we're done.
  if (cloudPushSucceeded) {
    return;
  }

  // Fallback: Enqueue for background sync if offline or toCloud failed.
  console.log(`[${actionWithMeta.type}] Enqueuing action for background sync.`);
  const { repos } = ctx as any; // Using `any` for now to access enqueue methods
  const [feature, op] = actionWithMeta.type.split('/');
  const repo = repos[feature as keyof typeof repos];

  if (op === 'upsert' || op === 'create' || op === 'update' || op === 'resequence' || op === 'updateTitle' || op === 'archive') {
    await (repo as any).enqueueUpsert(actionWithMeta.payload);
  } else if (op === 'delete') {
    await (repo as any).enqueueRemove(actionWithMeta.payload.id);
  }
}
