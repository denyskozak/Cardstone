declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export interface RootOptions {
    identifierPrefix?: string;
    onRecoverableError?: (error: unknown) => void;
    onUnrecoverableError?: (error: unknown) => void;
    nonce?: string;
  }

  export interface HydrationOptions {
    onRecoverableError?: (error: unknown) => void;
    onUnrecoverableError?: (error: unknown) => void;
    nonce?: string;
  }

  export function createRoot(
    container: Element | DocumentFragment,
    options?: RootOptions
  ): Root;

  export function hydrateRoot(
    container: Element | Document,
    initialChildren: ReactNode,
    options?: HydrationOptions
  ): Root;

  const client: {
    createRoot: typeof createRoot;
    hydrateRoot: typeof hydrateRoot;
  };

  export default client;
}
