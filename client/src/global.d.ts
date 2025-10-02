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