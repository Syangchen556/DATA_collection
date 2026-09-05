export async function readJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}

export function errorMessage(value: unknown, fallback: string) {
  if (value && typeof value === 'object' && 'error' in value && typeof (value as { error?: unknown }).error === 'string') return (value as { error: string }).error;
  return fallback;
}
