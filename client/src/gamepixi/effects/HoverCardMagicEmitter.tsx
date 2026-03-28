import { useMemo, useRef } from 'react';
import { useTick } from '@pixi/react';
import { Texture, type Sprite } from 'pixi.js';

interface HoverCardMagicEmitterProps {
  x: number;
  y: number;
  side: 'left' | 'right';
  scale?: number;
}

type HoverParticle = {
  baseY: number;
  wobble: number;
  speed: number;
  drift: number;
  size: number;
  phase: number;
  tint: number;
};

const BASE_SIDE_OFFSET = 66;
const PARTICLE_COUNT = 16;

const PALETTE = [0xfff8cf, 0xdff7ff, 0xbdeaff, 0x7fd6ff];

function createParticles(): HoverParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    baseY: -58 + Math.random() * 116,
    wobble: 3 + Math.random() * 10,
    speed: 28 + Math.random() * 48,
    drift: 5 + Math.random() * 10,
    size: 0.06 + Math.random() * 0.12,
    phase: Math.random() * Math.PI * 2,
    tint: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? 0xbdeaff
  }));
}

export default function HoverCardMagicEmitter({
  x,
  y,
  side,
  scale = 1
}: HoverCardMagicEmitterProps) {
  const particles = useMemo(() => createParticles(), []);
  const spriteRefs = useRef<Array<Sprite | null>>([]);
  const timeMs = useRef(0);

  useTick((ticker) => {
    timeMs.current += ticker.deltaMS;
    const time = timeMs.current / 1000;
    const direction = side === 'left' ? -1 : 1;

    particles.forEach((particle, index) => {
      const sprite = spriteRefs.current[index];
      if (!sprite) {
        return;
      }

      const travel = (time * particle.speed + index * 11) % 126;
      const normalized = travel / 126;
      const xOffset = direction * (2 + normalized * 7 + Math.sin(time * 2 + particle.phase) * particle.drift);
      const yOffset = particle.baseY - travel + Math.sin(time * 3 + particle.phase) * particle.wobble;

      sprite.x = xOffset;
      sprite.y = yOffset;
      sprite.alpha = 0.2 + (1 - normalized) * 0.7;
      const pulse = 1 + Math.sin(time * 4 + particle.phase) * 0.22;
      sprite.scale.set(particle.size * pulse);
    });
  });

  const sideOffset = BASE_SIDE_OFFSET * scale;
  const verticalCenterOffset = 108 * scale;

  return (
    <pixiContainer
      x={x + (side === 'left' ? -sideOffset : sideOffset)}
      y={y - verticalCenterOffset}
    >
      {particles.map((particle, index) => (
        <pixiSprite
          key={index}
          ref={(instance: Sprite | null) => {
            spriteRefs.current[index] = instance;
          }}
          texture={Texture.WHITE}
          anchor={0.5}
          alpha={0}
          tint={particle.tint}
          blendMode="add"
        />
      ))}
    </pixiContainer>
  );
}
