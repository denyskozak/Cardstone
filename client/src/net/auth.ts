const AUTH_TOKEN_KEY = 'cardstone:authToken';

type AuthNonceResponse = {
  nonce: string;
  message: string;
};

type AuthLoginResponse = {
  token: string;
  expiresIn: number;
  address: string;
};

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_HTTP_URL ?? import.meta.env.VITE_API_URL ?? '';
  if (!configured) {
    return '';
  }
  if (configured.startsWith('ws://')) {
    return configured.replace('ws://', 'http://');
  }
  if (configured.startsWith('wss://')) {
    return configured.replace('wss://', 'https://');
  }
  return configured;
}

function buildApiUrl(path: string): string {
  const base = resolveApiBaseUrl();
  if (!base) {
    return path;
  }
  return new URL(path, base).toString();
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function fetchAuthNonce(): Promise<AuthNonceResponse> {
  const response = await fetch(buildApiUrl('/api/auth/nonce'));
  if (!response.ok) {
    throw new Error('Failed to fetch nonce.');
  }
  return (await response.json()) as AuthNonceResponse;
}

export async function loginWithSignature(payload: {
  address: string;
  nonce: string;
  signature: string;
}): Promise<AuthLoginResponse> {
  const response = await fetch(buildApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error('Login failed.');
  }
  return (await response.json()) as AuthLoginResponse;
}
