import { useCallback, useRef } from 'react';
import { useTick } from '@pixi/react';
import type { Container, Graphics } from 'pixi.js';

interface TargetReticleProps {
  x: number;
  y: number;
  radius: number;
  color?: number;
  lineWidth?: number;
  alpha?: number;
  pulse?: boolean;
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
}

const DEFAULT_PULSE_SPEED = 0.12;
const DEFAULT_PULSE_AMPLITUDE = 0.08;

export default function TargetReticle({
  x,
  y,
  radius,
  color = 0xffffff,
  lineWidth = 4,
  alpha = 0.95,
  pulse = true,
  scaleX = 1,
  scaleY = 1,
  zIndex = 0
}: TargetReticleProps) {
  const containerRef = useRef<Container | null>(null);
  const phaseRef = useRef(0);

  useTick((delta) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (!pulse) {
      if (container.scale.x !== scaleX || container.scale.y !== scaleY) {
        container.scale.set(scaleX, scaleY);
      }
      return;
    }
    phaseRef.current += delta * DEFAULT_PULSE_SPEED;
    const wave = Math.sin(phaseRef.current);
    const scale = 1 + wave * DEFAULT_PULSE_AMPLITUDE;
    container.scale.set(scaleX * scale, scaleY * scale);
  });

  const handleRef = useCallback((instance: Container | null) => {
    containerRef.current = instance;
    if (instance) {
      instance.scale.set(scaleX, scaleY);
    }
  }, [scaleX, scaleY]);

  const draw = useCallback(
    (graphics: Graphics) => {
      graphics.clear();
      graphics.lineStyle(lineWidth, color, alpha);
      graphics.drawCircle(0, 0, radius);
      graphics.drawCircle(0, 0, radius * 0.55);

      const inner = radius * 0.35;
      const outer = radius * 0.95;

      graphics.moveTo(-outer, 0);
      graphics.lineTo(-inner, 0);
      graphics.moveTo(outer, 0);
      graphics.lineTo(inner, 0);
      graphics.moveTo(0, -outer);
      graphics.lineTo(0, -inner);
      graphics.moveTo(0, outer);
      graphics.lineTo(0, inner);
    },
    [alpha, color, lineWidth, radius]
  );

  return (
    <pixiContainer x={x} y={y} ref={handleRef} zIndex={zIndex}>
      <pixiGraphics draw={draw} />
    </pixiContainer>
  );
}
