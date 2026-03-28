import { useCallback, useEffect, useMemo, useState } from 'react';
import { Emitter } from '@pixi/particle-emitter';
import { Texture, Ticker, type Container } from 'pixi.js';

interface HealingBurstEmitterProps {
  x: number;
  y: number;
  onComplete: () => void;
}

const EMIT_DURATION_MS = 340;
const MAX_LIFETIME_MS = 1200;

export default function HealingBurstEmitter({ x, y, onComplete }: HealingBurstEmitterProps) {
  const [container, setContainer] = useState<Container | null>(null);

  const config = useMemo(
    () => ({
      lifetime: { min: 0.45, max: 0.9 },
      frequency: 0.004,
      spawnChance: 1,
      particlesPerWave: 2,
      emitterLifetime: 0.34,
      maxParticles: 180,
      addAtBack: false,
      behaviors: [
        {
          type: 'alpha',
          config: {
            alpha: {
              list: [
                { time: 0, value: 0 },
                { time: 0.15, value: 0.95 },
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
                { time: 0, value: 0.52 },
                { time: 1, value: 0.12 }
              ]
            },
            minMult: 0.7
          }
        },
        {
          type: 'color',
          config: {
            color: {
              list: [
                { time: 0, value: '#d2ff8f' },
                { time: 0.45, value: '#5cf27d' },
                { time: 1, value: '#27c76f' }
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
                { time: 0, value: 260 },
                { time: 1, value: 70 }
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
              radius: 52,
              innerRadius: 14,
              affectRotation: false
            }
          }
        },
        {
          type: 'rotation',
          config: {
            accel: 0,
            minSpeed: 0,
            maxSpeed: 0,
            minStart: 200,
            maxStart: 340
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

    const tick = (tickerRef: Ticker) => {
      const deltaMS = tickerRef.deltaMS;
      elapsed += deltaMS;
      emitter.update(deltaMS / 1000);
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
