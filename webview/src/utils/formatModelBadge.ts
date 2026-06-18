export function formatModelBadge(provider?: string | null, model?: string | null): string {
  const p = provider || '';
  const m = model || '';
  if (!m) return p || '?';
  if (p && m.startsWith(`${p}/`)) return m;
  if (p) return `${p}/${m}`;
  return m;
}
