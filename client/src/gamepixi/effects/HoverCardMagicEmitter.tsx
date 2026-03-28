import { useCallback, useEffect, useMemo, useState } from 'react';
import { Emitter } from '@pixi/particle-emitter';
import { Texture, Ticker, type Container } from 'pixi.js';

interface HoverCardMagicEmitterProps {
  x: number;
  y: number;
  side: 'left' | 'right';
  scale?: number;
}

const BASE_SIDE_OFFSET = 66;

export default function HoverCardMagicEmitter({
  x,
  y,
  side,
  scale = 1
}: HoverCardMagicEmitterProps) {
  const [container, setContainer] = useState<Container | null>(null);

  const config = useMemo(() => {
    const direction = side === 'left' ? -1 : 1;
    return {
      lifetime: { min: 0.35, max: 0.85 },
      frequency: 0.022,
      spawnChance: 1,
      particlesPerWave: 1,
      emitterLifetime: -1,
      maxParticles: 90,
      addAtBack: false,
      behaviors: [
        {
          type: 'alpha',
          config: {
            alpha: {
              list: [
                { time: 0, value: 0 },
                { time: 0.12, value: 0.8 },
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
                { time: 0, value: 0.28 },
                { time: 1, value: 0.06 }
              ]
            },
            minMult: 1
          }
        },
        {
          type: 'color',
          config: {
            color: {
              list: [
                { time: 0, value: '#fff8cf' },
                { time: 0.45, value: '#c9f3ff' },
                { time: 1, value: '#7fd6ff' }
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
                { time: 0, value: 210 },
                { time: 1, value: 60 }
              ]
            }
          }
        },
        {
          type: 'spawnShape',
          config: {
            type: 'rect',
            data: {
              x: direction * 4,
              y: 0,
              w: 6,
              h: 126,
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
            minStart: direction === -1 ? 330 : 210,
            maxStart: direction === -1 ? 430 : 310
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
    };
  }, [side]);

  useEffect(() => {
    if (!container) {
      return;
    }

    const emitter = new Emitter(container, config);
    emitter.updateOwnerPos(0, 0);
    emitter.resetPositionTracking();
    emitter.emit = true;

    const ticker = Ticker.shared;

    const tick = (tickerRef: Ticker) => {
      emitter.update(tickerRef.deltaMS / 1000);
    };

    ticker.add(tick);

    return () => {
      ticker.remove(tick);
      emitter.emit = false;
      if (typeof emitter.cleanup === 'function') {
        emitter.cleanup();
      }
      emitter.destroy();
    };
  }, [config, container]);

  const handleRef = useCallback((instance: Container | null) => {
    setContainer(instance ?? null);
  }, []);

  const sideOffset = BASE_SIDE_OFFSET * scale;
  const verticalCenterOffset = 108 * scale;

  return (
    <pixiContainer
      ref={handleRef}
      x={x + (side === 'left' ? -sideOffset : sideOffset)}
      y={y - verticalCenterOffset}
    />
  );
}
