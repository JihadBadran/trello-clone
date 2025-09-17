export function assertCardTitle(title: string): string {
  const t = title.trim();
  if (t.length < 1 || t.length > 200) throw new Error('Card title length 1..200');
  return t;
}