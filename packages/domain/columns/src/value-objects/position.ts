export function assertPosition(n: number): number {
  if (!Number.isFinite(n)) throw new Error('Position must be finite number');
  return n;
}
export function midpoint(a: number, b: number): number {
  return (a + b) / 2;
}