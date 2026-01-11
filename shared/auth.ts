const AUTH_MESSAGE_PREFIX = 'Cardstone login';

export function createAuthMessage(nonce: string): string {
  return `${AUTH_MESSAGE_PREFIX}\nNonce: ${nonce}`;
}
