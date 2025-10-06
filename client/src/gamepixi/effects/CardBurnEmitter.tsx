import { useCallback, useEffect, useMemo, useState } from 'react';
import { Emitter } from '@pixi/particle-emitter';
import { Texture, Ticker, type Container } from 'pixi.js';

interface CardBurnEmitterProps {
  x: number;
  y: number;
  onComplete: () => void;
}

const EMIT_DURATION_MS = 450;
const MAX_LIFETIME_MS = 1400;

export default function CardBurnEmitter({ x, y, onComplete }: CardBurnEmitterProps) {
  const [container, setContainer] = useState<Container | null>(null);

  const config = useMemo(
    () => ({
      lifetime: { min: 0.4, max: 0.7 },
      frequency: 0.002,
      spawnChance: 1,
      particlesPerWave: 1,
      emitterLifetime: 0.48,
      maxParticles: 250,
      addAtBack: false,
      behaviors: [
        {
          type: 'alpha',
          config: {
            alpha: {
              list: [
                { time: 0, value: 0.95 },
                { time: 0.5, value: 0.6 },
                { time: 1, value: 0 }
              ]
            }
          }
        },
        {
          type: 'scale',
          config: {
            scale: {
              list: [
                { time: 0, value: 0.9 },
                { time: 1, value: 0.3 }
              ]
            },
            minMult: 0.6
          }
        },
        {
          type: 'color',
          config: {
            color: {
              list: [
                { time: 0, value: '#ffeaa7' },
                { time: 0.45, value: '#ff8a3c' },
                { time: 1, value: '#ff3f34' }
              ]
            }
          }
        },
        {
          type: 'rotationStatic',
          config: { min: 0, max: 360 }
        },
        {
          type: 'moveSpeed',
          config: {
            speed: {
              list: [
                { time: 0, value: 340 },
                { time: 1, value: 120 }
              ]
            }
          }
        },
        {
          type: 'spawnShape',
          config: {
            type: 'torus',
            data: {
              x: 0,
              y: 0,
              radius: 68,
              innerRadius: 18,
              affectRotation: false
            }
          }
        },
        {
          type: 'textureSingle',
          config: {
            texture: Texture.WHITE
          }
        },
        {
          type: 'blendMode',
          config: {
            blendMode: 'add'
          }
        }
      ]
    }),
    []
  );

  useEffect(() => {
    if (!container) {
      return;
    }

    const emitter = new Emitter(container, config);
    emitter.updateOwnerPos(0, 0);
    emitter.resetPositionTracking();
    emitter.emit = true;

    const ticker = Ticker.shared;
    let completed = false;
    let elapsed = 0;

    if (typeof window === 'undefined') {
      emitter.emit = false;
      if (typeof emitter.cleanup === 'function') {
        emitter.cleanup();
      }
      emitter.destroy();
      onComplete();
      return () => {
        /** noop */
      };
    }

    const stopTimer = window.setTimeout(() => {
      emitter.emit = false;
    }, EMIT_DURATION_MS);

    const tick = (deltaMS: number) => {
      const delta = deltaMS / 1000;
      elapsed += deltaMS;
      emitter.update(delta);
      if (elapsed >= MAX_LIFETIME_MS || (!emitter.emit && emitter.particleCount === 0)) {
        cleanup();
      }
    };

    const cleanup = () => {
      if (completed) {
        return;
      }
      completed = true;
      window.clearTimeout(stopTimer);
      ticker.remove(tick);
      emitter.emit = false;
      if (typeof emitter.cleanup === 'function') {
        emitter.cleanup();
      }
      emitter.destroy();
      onComplete();
    };

    ticker.add(tick);

    return () => {
      cleanup();
    };
  }, [config, container, onComplete]);

  const handleRef = useCallback((instance: Container | null) => {
    setContainer(instance ?? null);
  }, []);

  return <pixiContainer ref={handleRef} x={x} y={y} />;
}
