
/**
 * Compare two objects with an `updatedAt` field (Last-Write-Wins).
 *
 * @returns
 *   -1 if a < b (b is newer)
 *    0 if equal (same timestamp + tie-breaker)
 *    1 if a > b (a is newer)
 */
export function compareLww<
  T extends { id: string | number; updatedAt: string }
>(a: T, b: T): -1 | 0 | 1 {
  const ta = Date.parse(a.updatedAt as string)
  const tb = Date.parse(b.updatedAt as string)

  if (ta < tb) return -1
  if (ta > tb) return 1

  // Tie-breaker (stable, deterministic)
  const idA = String(a.id)
  const idB = String(b.id)
  if (idA < idB) return -1
  if (idA > idB) return 1

  return 0
}