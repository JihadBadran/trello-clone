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
 * It first persists the change locally (including outbox enqueueing), then attempts an eager push to the cloud.
 * If the cloud push fails or is not possible, the action will be processed later by the sync controller.
 */
export async function handlePersistence<A extends Action, Ctx>(
  handler: ActionImpl<A, Ctx>,
  ctx: Ctx,
  actionWithMeta: A,
) {
  // Always persist to local DB first for data integrity.
  // The toPersist handler should handle both local storage and outbox enqueueing.
  if (handler.toPersist) {
    await handler.toPersist(ctx, actionWithMeta);
  }

  // Attempt to push to the cloud eagerly.
  const cloudPushSucceeded = await tryEagerCloudPush(handler, ctx, actionWithMeta);

  // If the cloud push was successful, we're done.
  if (cloudPushSucceeded) {
    console.log(`[${actionWithMeta.type}] Cloud push succeeded, action completed.`);
    return;
  }

  // If we reach here, the action has been persisted locally and enqueued for background sync.
  console.log(`[${actionWithMeta.type}] Action persisted locally and enqueued for background sync.`);
}
