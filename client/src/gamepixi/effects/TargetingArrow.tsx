import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUiStore } from '../../state/store';
import useMiniTicker from '../hooks/useMiniTicker';
import type { Graphics } from 'pixi.js';

// Hearthstone's targeting line looks "hand drawn" because it is smooth yet chunky;
// 32 samples keep the curve fluid while still allowing us to rebuild the geometry each frame.
const SAMPLE_COUNT = 32;
const BASE_BODY_WIDTH = 28;
const TIP_WIDTH = 12;
const TIP_LENGTH = 46;
const NORMALIZE_EPSILON = 1e-4;
const PARTICLE_COUNT = 14;

interface Vec2 {
  x: number;
  y: number;
}

interface CurveCache {
  positions: Float32Array;
  tangents: Float32Array;
}

interface CurveGeometry {
  positions: Float32Array;
  tangents: Float32Array;
  tipPosition: Vec2;
  tipDirection: Vec2;
}

interface Particle {
  position: Vec2;
  velocity: Vec2;
  life: number;
  ttl: number;
  size: number;
}

function normalize(vec: Vec2): Vec2 {
  const mag = Math.hypot(vec.x, vec.y);
  if (mag < NORMALIZE_EPSILON) {
    return { x: 0, y: 0 };
  }
  return { x: vec.x / mag, y: vec.y / mag };
}

function computeCurve(
  cache: CurveCache,
  origin: Vec2,
  target: Vec2,
  bendPulse: number
): CurveGeometry {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const length = Math.hypot(dx, dy);

  const safeLength = Math.max(length, NORMALIZE_EPSILON);
  const dir = { x: dx / safeLength, y: dy / safeLength };
  const normal = { x: -dir.y, y: dir.x };

  // A short drag should still feel responsive, while longer drags get the dramatic bend.
  const distanceFactor = Math.min(1.25, Math.max(0.45, safeLength / 380));
  const bendEnvelope = distanceFactor + bendPulse * 0.18;
  const k1 = 0.25 * bendEnvelope;
  const k2 = 0.15 * bendEnvelope;

  const control1 = {
    x: origin.x + normal.x * safeLength * k1,
    y: origin.y + normal.y * safeLength * k1
  };
  const control2 = {
    x: target.x + normal.x * safeLength * k2,
    y: target.y + normal.y * safeLength * k2
  };

  const { positions, tangents } = cache;

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const t = i / (SAMPLE_COUNT - 1);
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    const px =
      oneMinusTCubed * origin.x +
      3 * oneMinusTSquared * t * control1.x +
      3 * oneMinusT * tSquared * control2.x +
      tCubed * target.x;
    const py =
      oneMinusTCubed * origin.y +
      3 * oneMinusTSquared * t * control1.y +
      3 * oneMinusT * tSquared * control2.y +
      tCubed * target.y;

    const derivativeX =
      3 * oneMinusTSquared * (control1.x - origin.x) +
      6 * oneMinusT * t * (control2.x - control1.x) +
      3 * tSquared * (target.x - control2.x);
    const derivativeY =
      3 * oneMinusTSquared * (control1.y - origin.y) +
      6 * oneMinusT * t * (control2.y - control1.y) +
      3 * tSquared * (target.y - control2.y);

    positions[i * 2] = px;
    positions[i * 2 + 1] = py;
    tangents[i * 2] = derivativeX;
    tangents[i * 2 + 1] = derivativeY;
  }

  const tipIndex = (SAMPLE_COUNT - 1) * 2;
  const tipPosition = {
    x: positions[tipIndex],
    y: positions[tipIndex + 1]
  };
  const tipDirection = normalize({
    x: tangents[tipIndex],
    y: tangents[tipIndex + 1]
  });

  return { positions, tangents, tipPosition, tipDirection };
}

function useSmoothedPoint(target: Vec2 | null, stiffness = 18) {
  const [point, setPoint] = useState<Vec2 | null>(target);
  const targetRef = useRef<Vec2 | null>(target);
  const pointRef = useRef<Vec2 | null>(target);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useMiniTicker((deltaMS) => {
    const desired = targetRef.current;
    if (!desired) {
      if (pointRef.current !== null) {
        pointRef.current = null;
        setPoint(null);
      }
      return;
    }
    const current = pointRef.current ?? desired;
    const dt = Math.min(deltaMS / 1000, 0.05);
    // Exponential smoothing keeps the arrow slightly behind the cursor, reinforcing "elastic" feedback.
    const lerp = 1 - Math.exp(-stiffness * dt);
    const next = {
      x: current.x + (desired.x - current.x) * lerp,
      y: current.y + (desired.y - current.y) * lerp
    };
    const dx = Math.abs(next.x - current.x);
    const dy = Math.abs(next.y - current.y);
    if (dx < 0.1 && dy < 0.1) {
      if (!pointRef.current || pointRef.current.x !== desired.x || pointRef.current.y !== desired.y) {
        pointRef.current = { ...desired };
        setPoint({ ...desired });
      }
      return;
    }
    pointRef.current = next;
    setPoint(next);
  }, Boolean(target));

  return point;
}

function usePulse(frequency = 2.4, enabled = true) {
  const [value, setValue] = useState(0);
  const phaseRef = useRef(0);
  useMiniTicker((deltaMS) => {
    const dt = deltaMS / 1000;
    const nextPhase = phaseRef.current + dt * frequency * Math.PI * 2;
    phaseRef.current = nextPhase % (Math.PI * 2);
    setValue(Math.sin(phaseRef.current));
  }, enabled);
  return value;
}

function useParticles(initialDirection: Vec2, enabled = true) {
  const graphicsRef = useRef<Graphics | null>(null);
  const particlesRef = useRef<Particle[] | null>(null);
  const positionRef = useRef<Vec2>({ x: 0, y: 0 });
  const directionRef = useRef<Vec2>(normalize(initialDirection));

  if (!particlesRef.current) {
    particlesRef.current = new Array(PARTICLE_COUNT).fill(null).map(() => ({
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      life: 1,
      ttl: 0,
      size: 2
    }));
  }

  const respawnParticle = (particle: Particle) => {
    const tip = positionRef.current;
    const dir = directionRef.current;
    const perpendicular = { x: -dir.y, y: dir.x };
    const speed = 200 + Math.random() * 100;
    // The sparks are biased forward so they travel with the tip instead of drifting backwards.
    const ttl = 0.2 + Math.random() * 0.2;
    const spread = (Math.random() - 0.5) * 10;
    particle.position.x = tip.x - dir.x * 6 + perpendicular.x * spread;
    particle.position.y = tip.y - dir.y * 6 + perpendicular.y * spread;
    particle.velocity.x = dir.x * speed + perpendicular.x * (Math.random() - 0.5) * 80;
    particle.velocity.y = dir.y * speed + perpendicular.y * (Math.random() - 0.5) * 80;
    particle.life = 0;
    particle.ttl = ttl;
    particle.size = 2 + Math.random() * 2;
  };

  useMiniTicker((deltaMS) => {
    const graphics = graphicsRef.current;
    if (!graphics) {
      return;
    }
    const particles = particlesRef.current;
    if (!particles) {
      return;
    }
    const dt = Math.min(deltaMS / 1000, 0.05);
    graphics.clear();
    particles.forEach((particle) => {
      particle.life += dt;
      if (particle.life >= particle.ttl) {
        respawnParticle(particle);
      }
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      const progress = particle.life / particle.ttl;
      const alpha = Math.max(0, 1 - progress);
      const radius = particle.size * (1 - progress * 0.6);
      graphics.beginFill(0xffeaa7, alpha * 0.9);
      graphics.drawCircle(particle.position.x, particle.position.y, radius);
      graphics.endFill();
    });
  }, enabled);

  const setEmitterPosition = useCallback((position: Vec2) => {
    positionRef.current = position;
  }, []);

  const setEmitterDirection = useCallback((direction: Vec2) => {
    directionRef.current = normalize(direction);
  }, []);

  return {
    graphicsRef,
    setEmitterPosition,
    setEmitterDirection
  };
}

export default function TargetingArrow() {
  const targeting = useUiStore((state) => state.targeting);
  const smoothedCurrent = useSmoothedPoint(targeting ? targeting.current : null);
  // Small sinusoidal modulation keeps the curve alive even when the cursor rests.
  const bendPulse = usePulse(1.8, Boolean(targeting));
  const cacheRef = useRef<CurveCache>();
  const lastCurveRef = useRef<CurveGeometry | null>(null);
  const hasTarget = Boolean(targeting && smoothedCurrent);
  const origin = targeting?.origin ?? null;

  const { positions, tangents, tipPosition, tipDirection } = useMemo(() => {
    if (!cacheRef.current) {
      cacheRef.current = {
        positions: new Float32Array(SAMPLE_COUNT * 2),
        tangents: new Float32Array(SAMPLE_COUNT * 2)
      };
    }
    const cache = cacheRef.current;
    if (hasTarget && origin && smoothedCurrent) {
      const curve = computeCurve(cache, origin, smoothedCurrent, bendPulse * 0.12);
      lastCurveRef.current = curve;
      return curve;
    }
    return (
      lastCurveRef.current ?? {
        positions: cache.positions,
        tangents: cache.tangents,
        tipPosition: { x: 0, y: 0 },
        tipDirection: { x: 1, y: 0 }
      }
    );
  }, [bendPulse, hasTarget, origin?.x, origin?.y, smoothedCurrent?.x, smoothedCurrent?.y]);

  const { graphicsRef, setEmitterDirection, setEmitterPosition } = useParticles(tipDirection, hasTarget);

  const tipX = tipPosition.x;
  const tipY = tipPosition.y;
  const tipDirX = tipDirection.x;
  const tipDirY = tipDirection.y;

  useEffect(() => {
    if (!hasTarget) {
      return;
    }
    setEmitterPosition({ x: tipX, y: tipY });
  }, [hasTarget, setEmitterPosition, tipX, tipY]);

  useEffect(() => {
    if (!hasTarget) {
      return;
    }
    setEmitterDirection({ x: tipDirX, y: tipDirY });
  }, [hasTarget, setEmitterDirection, tipDirX, tipDirY]);

  const tipRotation = Math.atan2(tipDirection.y, tipDirection.x);

  const drawBody = (graphics: Graphics) => {
    graphics.clear();
    const leftOutline: Vec2[] = [];
    const rightOutline: Vec2[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const px = positions[i * 2];
      const py = positions[i * 2 + 1];
      const tx = tangents[i * 2];
      const ty = tangents[i * 2 + 1];
      const tangentLength = Math.hypot(tx, ty) || 1;
      const nx = -ty / tangentLength;
      const ny = tx / tangentLength;
      const t = i / (SAMPLE_COUNT - 1);
      const widthPulse = 1 + bendPulse * 0.15;
      const width =
        (BASE_BODY_WIDTH * widthPulse) * (1 - t * 0.55) +
        (TIP_WIDTH + 4) * t;
      const halfWidth = width * 0.5;
      leftOutline.push({ x: px + nx * halfWidth, y: py + ny * halfWidth });
      rightOutline.push({ x: px - nx * halfWidth, y: py - ny * halfWidth });
    }

    // The fill-first, stroke-second order matches how Hearthstone's VFX keeps the center glowing.
    graphics.lineStyle(3, 0xffffff, 0.18);
    graphics.beginFill(0xd63031, 0.92);
    graphics.moveTo(leftOutline[0].x, leftOutline[0].y);
    for (let i = 1; i < leftOutline.length; i += 1) {
      graphics.lineTo(leftOutline[i].x, leftOutline[i].y);
    }
    for (let i = rightOutline.length - 1; i >= 0; i -= 1) {
      graphics.lineTo(rightOutline[i].x, rightOutline[i].y);
    }
    graphics.closePath();
    graphics.endFill();

    graphics.lineStyle(2, 0xff7675, 0.65);
    graphics.moveTo(positions[0], positions[1]);
    for (let i = 1; i < SAMPLE_COUNT; i += 1) {
      graphics.lineTo(positions[i * 2], positions[i * 2 + 1]);
    }
  };

  const drawHead = (graphics: Graphics) => {
    graphics.clear();
    graphics.lineStyle(2, 0xffffff, 0.24);
    graphics.beginFill(0xc0392b, 1);
    graphics.moveTo(0, 0);
    graphics.lineTo(-TIP_LENGTH, TIP_WIDTH * 0.9);
    graphics.quadraticCurveTo(-TIP_LENGTH * 0.5, 0, -TIP_LENGTH, -TIP_WIDTH * 0.9);
    graphics.closePath();
    graphics.endFill();
  };

  if (!hasTarget) {
    return null;
  }

  return (
    <pixiContainer eventMode="none">
      <pixiGraphics draw={drawBody} />
      <pixiContainer x={tipPosition.x} y={tipPosition.y} rotation={tipRotation} eventMode="none">
        <pixiGraphics draw={drawHead} />
      </pixiContainer>
      <pixiGraphics ref={graphicsRef} eventMode="none" />
    </pixiContainer>
  );
}
