import type { ReactNode } from 'react';

declare module 'react-dom/client' {
  interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  interface CreateRootOptions {
    onRecoverableError?(error: unknown): void;
    identifierPrefix?: string;
  }

  export function createRoot(
    container: Element | DocumentFragment,
    options?: CreateRootOptions
  ): Root;
}
