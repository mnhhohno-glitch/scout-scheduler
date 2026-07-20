export function sanitizeCid(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (v.length > 100) return undefined;
  if (!/^[A-Za-z0-9_-]+$/.test(v)) return undefined;
  return v;
}
