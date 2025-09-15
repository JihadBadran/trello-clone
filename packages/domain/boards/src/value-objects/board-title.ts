export function assertBoardTitle(title: string): string {
  const t = title.trim();
  if (t.length < 1 || t.length > 120) throw new Error('Board title length 1..120');
  return t;
}