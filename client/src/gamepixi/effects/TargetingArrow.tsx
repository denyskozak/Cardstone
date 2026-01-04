import { useEffect, useMemo, useState } from 'react';
import type { PlayerSide } from '@cardstone/shared/types';
import { Assets, Texture } from 'pixi.js';
import { useUiStore } from '../../state/store';

interface TargetingArrowProps {
  playerSide: PlayerSide;
}

const ARROW_THICKNESS = 32;

export default function TargetingArrow({ playerSide: _playerSide }: TargetingArrowProps) {
  const targeting = useUiStore((state) => state.targeting);

  const [arrowTexture, setArrowTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    Assets.load('/assets/target.svg').then((texture) => {
      if (!cancelled) {
        setArrowTexture(texture);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const arrow = useMemo(() => {
    if (!targeting) {
      return null;
    }
    const dx = targeting.current.x - targeting.origin.x;
    const dy = targeting.current.y - targeting.origin.y;
    const length = Math.max(Math.hypot(dx, dy), 1);
    const rotation = Math.atan2(dy, dx);
    return {
      x: targeting.origin.x,
      y: targeting.origin.y,
      width: length,
      rotation
    };
  }, [targeting]);

  if (!arrow || !arrowTexture) {
    return null;
  }

  return (
    <pixiSprite
      texture={arrowTexture}
      x={arrow.x}
      y={arrow.y}
      width={arrow.width}
      height={ARROW_THICKNESS}
      rotation={arrow.rotation}
      anchor={{ x: 0, y: 0.5 }}
      eventMode="none"
      alpha={0.9}
    />
  );
}
