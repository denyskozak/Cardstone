import { useEffect, useMemo, useRef } from 'react';
import { useTick } from '@pixi/react';
import { Texture, type Sprite } from 'pixi.js';

interface CardBurnEmitterProps {
  x: number;
  y: number;
  onComplete: () => void;
}

const MAX_LIFETIME_MS = 1400;
const PARTICLE_COUNT = 40;

type BurstParticle = {
  angle: number;
  radiusStart: number;
  radiusVelocity: number;
  lifeMs: number;
  delayMs: number;
  size: number; // теперь это размер в пикселях
  tint: number;
  spin: number;
};

const PALETTE = [0xffeaa7, 0xffc36d, 0xff8a3c, 0xff5b38, 0xff3f34];

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

function createParticles(): BurstParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;

    return {
      angle,
      radiusStart: 14 + Math.random() * 18,
      radiusVelocity: 74 + Math.random() * 130,
      lifeMs: 520 + Math.random() * 760,
      delayMs: Math.random() * 280,
      size: 8 + Math.random() * 16, // было слишком мало
      tint: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? 0xff8a3c,
      spin: (Math.random() - 0.5) * 0.35
    };
  });
}

export default function CardBurnEmitter({ x, y, onComplete }: CardBurnEmitterProps) {
  const particles = useMemo(() => createParticles(), []);
  const spriteRefs = useRef<Array<Sprite | null>>([]);
  const elapsedMs = useRef(0);
  const completedRef = useRef(false);
console.log("2", 2);
  useEffect(() => {
    return () => {
      completedRef.current = true;
    };
  }, []);

  useTick((ticker) => {
    elapsedMs.current += ticker.deltaMS;
    const elapsed = elapsedMs.current;

    particles.forEach((particle, index) => {
      const sprite = spriteRefs.current[index];
      if (!sprite) return;

      const localElapsed = elapsed - particle.delayMs;

      if (localElapsed <= 0 || localElapsed >= particle.lifeMs) {
        sprite.visible = false;
        return;
      }

      const progress = Math.min(1, Math.max(0, localElapsed / particle.lifeMs));
      const eased = easeOutCubic(progress);
      const radius = particle.radiusStart + particle.radiusVelocity * eased;

      sprite.visible = true;
      sprite.x = Math.cos(particle.angle) * radius;
      sprite.y = Math.sin(particle.angle) * radius;
      sprite.rotation += particle.spin * ticker.deltaTime;
      sprite.alpha = 1 - progress;

      const pulse = 1 + Math.sin((progress + index * 0.07) * Math.PI * 2) * 0.12;
      const size = particle.size * pulse * (1 - progress * 0.45);

      sprite.width = size;
      sprite.height = size;
    });

    if (!completedRef.current && elapsed >= MAX_LIFETIME_MS) {
      completedRef.current = true;
      onComplete();
    }
  });

  return (
    <pixiContainer x={x} y={y}>
      {particles.map((particle, index) => (
        <pixiSprite
          key={index}
          ref={(instance: Sprite | null) => {
            spriteRefs.current[index] = instance;
          }}
          texture={Texture.WHITE}
          anchor={0.5}
          visible={false}
          alpha={0}
          tint={particle.tint}
          blendMode="add"
        />
      ))}
    </pixiContainer>
  );
}
