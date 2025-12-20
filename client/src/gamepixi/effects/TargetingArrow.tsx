import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerSide } from '@cardstone/shared/types';
import { useUiStore } from '../../state/store';
import useMiniTicker from '../hooks/useMiniTicker';
import { Assets, Texture, type Graphics } from 'pixi.js';
import TargetReticle from './TargetReticle';

// Hearthstone's targeting line looks "hand drawn" because it is smooth yet chunky;
// 32 samples keep the line fluid while still allowing us to rebuild the geometry each frame.
const SAMPLE_COUNT = 32;
const BASE_BODY_WIDTH = 28;
const TIP_WIDTH = 12;
const TIP_LENGTH = 46;
const TIP_SCALE = 1.8;
const TARGET_TEXTURE_ASPECT = 322 / 839;
const NORMALIZE_EPSILON = 1e-4;

type ArrowThemeKey = 'ally' | 'enemy' | 'neutral';

interface ArrowTheme {
  glow: number;
  bodyFill: number;
  bodyOutline: number;
  coreLine: number;
  headFill: number;
  headOutline: number;
  tailFill: number;
  spark: number;
}

const ARROW_THEMES: Record<ArrowThemeKey, ArrowTheme> = {
  ally: {
    glow: 0x8fdcff,
    bodyFill: 0x1f5fa8,
    bodyOutline: 0xbfe9ff,
    coreLine: 0xffffff,
    headFill: 0x17477c,
    headOutline: 0xe3f6ff,
    tailFill: 0x0e2f52,
    spark: 0xb3ecff
  },
  enemy: {
    glow: 0xff7d73,
    bodyFill: 0x9f1e14,
    bodyOutline: 0xffc1b0,
    coreLine: 0xffffff,
    headFill: 0x76160f,
    headOutline: 0xffe3d9,
    tailFill: 0x4e0d0a,
    spark: 0xffd0c6
  },
  neutral: {
    glow: 0xffd86b,
    bodyFill: 0x8a6414,
    bodyOutline: 0xfff0c7,
    coreLine: 0xffffff,
    headFill: 0x6d4d0e,
    headOutline: 0xfff8dd,
    tailFill: 0x4b3309,
    spark: 0xfff6d3
  }
};

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

function normalize(vec: Vec2): Vec2 {
  const mag = Math.hypot(vec.x, vec.y);
  if (mag < NORMALIZE_EPSILON) {
    return { x: 0, y: 0 };
  }
  return { x: vec.x / mag, y: vec.y / mag };
}

function computeCurve(cache: CurveCache, origin: Vec2, target: Vec2): CurveGeometry {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;

  const { positions, tangents } = cache;

  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const t = i / (SAMPLE_COUNT - 1);
    const px = origin.x + dx * t;
    const py = origin.y + dy * t;

    positions[i * 2] = px;
    positions[i * 2 + 1] = py;
    tangents[i * 2] = dx;
    tangents[i * 2 + 1] = dy;
  }

  const tipIndex = (SAMPLE_COUNT - 1) * 2;
  const tipPosition = {
    x: positions[tipIndex],
    y: positions[tipIndex + 1]
  };
  const tipDirection = normalize({ x: dx, y: dy });

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

interface TargetingArrowProps {
  playerSide: PlayerSide;
}

export default function TargetingArrow({ playerSide }: TargetingArrowProps) {
  // Когда игрок зажимает существо на доске, слой Board записывает в zustand-store структуру
  // TargetingState: точку старта (центр существа), id указателя и текущие координаты курсора.
  // Пока эта запись существует, Board обновляет поле `current` в onPointerMove, а этот эффект
  // просто читает состояние из стора и заново строит геометрию стрелки каждый кадр. Как только
  // Board сбрасывает TargetingState (на отпускании кнопки или отмене), компонент перестает
  // рендериться — именно так появляется и исчезает «стрелочка» наведения атаки.
  const targeting = useUiStore((state) => state.targeting);
  const currentTarget = useUiStore((state) => state.currentTarget ?? null);
  const smoothedCurrent = useSmoothedPoint(targeting ? targeting.current : null);
  const cacheRef = useRef<CurveCache | null>(null);
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
    if (cache && hasTarget && origin && smoothedCurrent) {
      const curve = computeCurve(cache, origin, smoothedCurrent);
      lastCurveRef.current = curve;
      return curve;
    }
    return (
      lastCurveRef.current ?? {
        positions: cache?.positions ?? new Float32Array(SAMPLE_COUNT * 2),
        tangents: cache?.tangents ?? new Float32Array(SAMPLE_COUNT * 2),
        tipPosition: { x: 0, y: 0 },
        tipDirection: { x: 1, y: 0 }
      }
    );
  }, [hasTarget, origin?.x, origin?.y, smoothedCurrent?.x, smoothedCurrent?.y]);

  const tipRotation = Math.atan2(tipDirection.y, tipDirection.x);

  const [pulsePhase, setPulsePhase] = useState(0);
  const [headTexture, setHeadTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    Assets.load('/assets/target.svg').then((texture) => {
      if (!cancelled) {
        setHeadTexture(texture);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useMiniTicker(
    (deltaMS) => {
      setPulsePhase((prev) => {
        const next = prev + deltaMS * 0.006;
        return next > Math.PI * 2 ? next - Math.PI * 2 : next;
      });
    },
    hasTarget
  );

  const pulseAlpha = 0.78 + 0.22 * Math.sin(pulsePhase);
  const sparkAlpha = 0.55 + 0.45 * Math.sin(pulsePhase * 1.5 + Math.PI / 3);

  const themeKey: ArrowThemeKey = currentTarget
    ? currentTarget.side === playerSide
      ? 'ally'
      : 'enemy'
    : 'neutral';
  const theme = ARROW_THEMES[themeKey];

  const drawGlow = (graphics: Graphics) => {
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
      const width =
        BASE_BODY_WIDTH * 1.35 * (1 - t * 0.5) +
        (TIP_WIDTH * 1.35 + 14) * t;
      const halfWidth = width * 0.5;
      leftOutline.push({ x: px + nx * halfWidth, y: py + ny * halfWidth });
      rightOutline.push({ x: px - nx * halfWidth, y: py - ny * halfWidth });
    }

    graphics.beginFill(theme.glow, 0.28 + 0.25 * pulseAlpha);
    graphics.moveTo(leftOutline[0].x, leftOutline[0].y);
    for (let i = 1; i < leftOutline.length; i += 1) {
      graphics.lineTo(leftOutline[i].x, leftOutline[i].y);
    }
    for (let i = rightOutline.length - 1; i >= 0; i -= 1) {
      graphics.lineTo(rightOutline[i].x, rightOutline[i].y);
    }
    graphics.closePath();
    graphics.endFill();
  };

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
      const width =
        BASE_BODY_WIDTH * (1 - t * 0.55) +
        (TIP_WIDTH + 6) * t;
      const halfWidth = width * 0.5;
      leftOutline.push({ x: px + nx * halfWidth, y: py + ny * halfWidth });
      rightOutline.push({ x: px - nx * halfWidth, y: py - ny * halfWidth });
    }

    graphics.lineStyle(4, theme.bodyOutline, 0.95);
    graphics.beginFill(theme.bodyFill, 0.95);
    graphics.moveTo(leftOutline[0].x, leftOutline[0].y);
    for (let i = 1; i < leftOutline.length; i += 1) {
      graphics.lineTo(leftOutline[i].x, leftOutline[i].y);
    }
    for (let i = rightOutline.length - 1; i >= 0; i -= 1) {
      graphics.lineTo(rightOutline[i].x, rightOutline[i].y);
    }
    graphics.closePath();
    graphics.endFill();

    graphics.lineStyle(2.4, theme.coreLine, 0.82);
    graphics.moveTo(positions[0], positions[1]);
    for (let i = 1; i < SAMPLE_COUNT; i += 1) {
      graphics.lineTo(positions[i * 2], positions[i * 2 + 1]);
    }
  };

  const drawHead = (graphics: Graphics) => {
    graphics.clear();
    const base = -TIP_LENGTH * TIP_SCALE;
    const wing = TIP_WIDTH * TIP_SCALE * 0.8;

    graphics.lineStyle(3, theme.headOutline, 0.95);
    graphics.beginFill(theme.headFill, 1);
    graphics.moveTo(0, 0);
    graphics.lineTo(base * 0.55, wing);
    graphics.lineTo(base, 0);
    graphics.lineTo(base * 0.55, -wing);
    graphics.closePath();
    graphics.endFill();

    const tailHeight = TIP_WIDTH * TIP_SCALE * 0.6;
    graphics.beginFill(theme.tailFill, 0.94);
    graphics.drawRoundedRect(base - 14, -tailHeight / 2, 16, tailHeight, 4);
    graphics.endFill();

    graphics.lineStyle(2.8, theme.spark, sparkAlpha);
    const sparkLength = TIP_LENGTH * 0.45;
    graphics.moveTo(base * 0.5, 0);
    graphics.lineTo(base * 0.5 - sparkLength, tailHeight * 0.5);
    graphics.moveTo(base * 0.5, 0);
    graphics.lineTo(base * 0.5 - sparkLength, -tailHeight * 0.5);
    graphics.moveTo(base * 0.8, 0);
    graphics.lineTo(base * 0.8 - sparkLength * 0.6, tailHeight * 0.9);
    graphics.moveTo(base * 0.8, 0);
    graphics.lineTo(base * 0.8 - sparkLength * 0.6, -tailHeight * 0.9);

    graphics.lineStyle(2, theme.coreLine, 0.85);
    graphics.moveTo(base, 0);
    graphics.lineTo(base - 12, 0);
  };

  const drawHeadGlow = (graphics: Graphics) => {
    graphics.clear();
    const base = -TIP_LENGTH * TIP_SCALE;
    const wing = TIP_WIDTH * TIP_SCALE * 1.05;
    graphics.beginFill(theme.glow, 0.38 + 0.32 * pulseAlpha);
    graphics.moveTo(6, 0);
    graphics.lineTo(base * 0.6, wing);
    graphics.lineTo(base - 6, 0);
    graphics.lineTo(base * 0.6, -wing);
    graphics.closePath();
    graphics.endFill();
  };

  if (!hasTarget) {
    return null;
  }

  return (
    <pixiContainer eventMode="none">
      <pixiGraphics draw={drawGlow} alpha={pulseAlpha} blendMode="add" />
      <pixiGraphics draw={drawBody} />
      {currentTarget ? (
        <TargetReticle
          x={tipPosition.x}
          y={tipPosition.y}
          radius={TIP_LENGTH * TIP_SCALE * 0.55}
          color={theme.headOutline}
          lineWidth={4.5}
          alpha={0.92}
          pulse
          zIndex={120}
        />
      ) : null}
      <pixiContainer x={tipPosition.x} y={tipPosition.y} rotation={tipRotation} eventMode="none">
        <pixiGraphics draw={drawHeadGlow} alpha={pulseAlpha} blendMode="add" />
        {headTexture ? (
          <pixiSprite
            texture={headTexture}
            anchor={0.5}
            width={TIP_LENGTH * TIP_SCALE * 2 * TARGET_TEXTURE_ASPECT}
            height={TIP_LENGTH * TIP_SCALE * 2}
            rotation={Math.PI / 2}
          />
        ) : (
          <pixiGraphics draw={drawHead} />
        )}
      </pixiContainer>
    </pixiContainer>
  );
}
