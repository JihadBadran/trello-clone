export function assertEmail(email: string): string {
  // lightweight guard; replace with zod if you prefer
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error('Invalid email');
  }
  return email.trim();
}