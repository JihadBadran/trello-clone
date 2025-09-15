export function assertColumnTitle(title: string): string {
  const t = title.trim();
  if (t.length < 1 || t.length > 120) throw new Error('Column title length 1..120');
  return t;
}