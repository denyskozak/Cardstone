import { useEffect, useMemo, useState } from 'react';
import { Assets, Texture } from 'pixi.js';

import { CARD_SIZE } from '../Card';
import { computeHandLayout, HAND_BASE_SCALE } from './Hand';

interface OpponentHandProps {
  count: number;
  width: number;
  height: number;
}

const CARD_BACK_TEXTURE = '/assets/card_skins/1.webp';

export default function OpponentHandLayer({ count, width, height }: OpponentHandProps) {
  const [texture, setTexture] = useState(Texture.EMPTY);

  useEffect(() => {
    if (texture !== Texture.EMPTY) {
      return;
    }
    let cancelled = false;
    Assets.load(CARD_BACK_TEXTURE).then((result) => {
      if (!cancelled) {
        setTexture(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [texture]);

  const positions = useMemo(() => {
    const layout = computeHandLayout(count, width, height);
    const verticalOffset = CARD_SIZE.height * HAND_BASE_SCALE * 0.5;
    return layout.map((base) => ({
      x: base.x,
      y: CARD_SIZE.height * HAND_BASE_SCALE + (height - base.y) - verticalOffset,
      rotation: -base.rotation,
      scale: base.scale,
      z: base.z,
    }));
  }, [count, height, width]);

  if (count === 0) {
    return null;
  }

  return (
    <pixiContainer sortableChildren eventMode="none">
      {positions.map((pos, index) => (
        <pixiContainer
          key={index}
          x={pos.x}
          y={pos.y}
          rotation={pos.rotation}
          scale={pos.scale}
          pivot={{ x: CARD_SIZE.width / 2, y: CARD_SIZE.height }}
          zIndex={pos.z}
        >
          <pixiSprite texture={texture} width={CARD_SIZE.width} height={CARD_SIZE.height} />
        </pixiContainer>
      ))}
    </pixiContainer>
  );
}
