import { useEffect, useMemo, useRef } from 'react';
import { useTick } from '@pixi/react';
import { Texture, type Sprite } from 'pixi.js';

interface HealingBurstEmitterProps {
  x: number;
  y: number;
  onComplete: () => void;
}

const MAX_LIFETIME_MS = 1200;
const PARTICLE_COUNT = 34;

type HealParticle = {
  angle: number;
  startRadius: number;
  radialVelocity: number;
  drift: number;
  lifeMs: number;
  delayMs: number;
  size: number;
  tint: number;
};

const PALETTE = [0xd2ff8f, 0x9dff9f, 0x5cf27d, 0x27c76f];

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

function createParticles(): HealParticle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = (Math.PI * 2 * index) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    return {
      angle,
      startRadius: 8 + Math.random() * 12,
      radialVelocity: 60 + Math.random() * 90,
      drift: 10 + Math.random() * 20,
      lifeMs: 430 + Math.random() * 650,
      delayMs: Math.random() * 180,
      size: 0.14 + Math.random() * 0.24,
      tint: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? 0x5cf27d
    };
  });
}

export default function HealingBurstEmitter({ x, y, onComplete }: HealingBurstEmitterProps) {
  const particles = useMemo(() => createParticles(), []);
  const spriteRefs = useRef<Array<Sprite | null>>([]);
  const elapsedMs = useRef(0);
  const completedRef = useRef(false);

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
      if (!sprite) {
        return;
      }

      const localElapsed = elapsed - particle.delayMs;
      if (localElapsed <= 0 || localElapsed >= particle.lifeMs) {
        sprite.visible = false;
        return;
      }

      const progress = Math.min(1, Math.max(0, localElapsed / particle.lifeMs));
      const eased = easeOutQuad(progress);
      const radius = particle.startRadius + particle.radialVelocity * eased;
      const drift = Math.sin((progress + index * 0.19) * Math.PI * 2) * particle.drift;

      sprite.visible = true;
      sprite.x = Math.cos(particle.angle) * radius + drift * 0.25;
      sprite.y = Math.sin(particle.angle) * radius - drift * 0.6;
      sprite.alpha = (1 - progress) * (0.45 + Math.sin(progress * Math.PI) * 0.55);
      const bloom = 1 + Math.sin((progress + index * 0.1) * Math.PI * 3) * 0.15;
      sprite.scale.set(particle.size * bloom * (1 - progress * 0.35));
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
