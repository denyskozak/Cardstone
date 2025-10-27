/// <reference path="./types/react-dom-client.d.ts" />
import '@pixi/react/types/global';
import type { PixiElements } from '@pixi/react/types/typedefs/PixiElements';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      pixiSprite: PixiElements['pixiSprite']
      pixiText: PixiElements['pixiText']
      pixiContainer: PixiElements['pixiContainer']
      pixiGraphics: PixiElements['pixiGraphics']
    }
  }
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react'

  interface Root {
    render(children: ReactNode): void
    unmount(): void
  }

  interface CreateRootOptions {
    onRecoverableError?(error: unknown): void
    identifierPrefix?: string
  }

  export function createRoot(
    container: Element | DocumentFragment,
    options?: CreateRootOptions
  ): Root
}
