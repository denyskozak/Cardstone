import {useEffect, useState} from "react";
import {Assets, Texture} from "pixi.js";

interface BackgroundProps {
  width: number;
  height: number;
}

export default function Background({ width, height }: BackgroundProps) {
    const [boardTexture, setBoardTexture] = useState<Texture>(Texture.EMPTY);
    const [deckTexture, setDeckTexture] = useState<Texture>(Texture.EMPTY);

    const deckWidth = 1050;
  const deckHeight = 650;
  const deckX = (width - deckWidth) / 2 + 10;
  const deckY = (height - deckHeight) / 2 - 10;

    useEffect(() => {
        let cancelled = false;
        Assets.load('/assets/board_template.webp').then((result) => {
            if (!cancelled) {
                setBoardTexture(result);
            }
        });

        Assets.load('/assets/deck_template.webp').then((result) => {
            if (!cancelled) {
                setDeckTexture(result);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);


  return (
    <>
      <pixiSprite texture={boardTexture} width={width} height={height} />
      <pixiSprite
          texture={deckTexture}
        width={deckWidth}
        height={deckHeight}
        x={deckX}
        y={deckY}
      />
    </>
  );
}
