export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');

export function apiPath(path: string): string {
  if (!path.startsWith('/')) {
    return `${API_URL}/${path}`;
  }
  return `${API_URL}${path}`;
}
