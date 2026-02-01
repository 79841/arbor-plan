export function getDateString(): string {
  return new Date().toISOString().split('T')[0]!;
}

export function getDateTimeString(): string {
  return new Date().toISOString();
}

export function getExpirationTime(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
