import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTick } from '@pixi/react';
import {
  BLEND_MODES,
  BlurFilter,
  Container,
  DRAW_MODES,
  Geometry,
  Graphics,
  Mesh,
  ParticleContainer,
  Point as PixiPoint,
  Sprite,
  Texture,
  WRAP_MODES
} from 'pixi.js';

export type Point = { x: number; y: number };

export type TargetArrowProps = {
  isAiming: boolean;
  source: Point;
  cursor: Point;
  valid: boolean;
  onConfirm?: (targetId: string | null, point: Point) => void;
  onCancel?: () => void;
  maxBend?: number;
  thickness?: number;
  headSize?: number;
  glow?: boolean;
  textureUrl?: string;
  mode?: 'rope' | 'graphics';
  snapPoint?: Point | null;
};

const SAMPLE_COUNT = 36;
const DEFAULT_MAX_BEND = 0.6;
const DEFAULT_THICKNESS = 16;
const DEFAULT_HEAD_SIZE = 28;
const HEAD_TEXTURE_BASE = 64;
const BODY_TEXTURE_HEIGHT = 48;
const SPARK_COUNT = 20;

interface RopeMeshState {
  mesh: Mesh;
  geometry: Geometry;
  positions: Float32Array;
  uvs: Float32Array;
  baseU: Float32Array;
}

interface FallbackState {
  graphics: Graphics;
  overlay: Sprite;
}

interface SparkParticle {
  sprite: Sprite;
  life: number;
  ttl: number;
  vx: number;
  vy: number;
}

interface SparkState {
  container: ParticleContainer;
  particles: SparkParticle[];
  spawnAccumulator: number;
}

interface AnimationState {
  alpha: number;
  scale: number;
  uvOffset: number;
  pulseTime: number;
  invalidPhase: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function approach(current: number, target: number, smoothing: number, dt: number) {
  if (smoothing <= 0) {
    return target;
  }
  const t = 1 - Math.exp(-dt * smoothing);
  return current + (target - current) * t;
}

let cachedBodyTexture: Texture | null = null;
let cachedOverlayTexture: Texture | null = null;
let cachedHeadTexture: Texture | null = null;
let cachedSparkTexture: Texture | null = null;

function ensureCanvasContext(width: number, height: number) {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  return { canvas, context } as const;
}

function createBodyTexture() {
  if (cachedBodyTexture) {
    return cachedBodyTexture;
  }
  const ctxResult = ensureCanvasContext(256, BODY_TEXTURE_HEIGHT);
  if (!ctxResult) {
    return Texture.WHITE;
  }
  const { canvas, context } = ctxResult;
  const gradient = context.createLinearGradient(0, 0, 0, BODY_TEXTURE_HEIGHT);
  gradient.addColorStop(0, '#ff6f61');
  gradient.addColorStop(0.15, '#e03f35');
  gradient.addColorStop(0.5, '#a61616');
  gradient.addColorStop(0.85, '#e03f35');
  gradient.addColorStop(1, '#ff8277');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalCompositeOperation = 'lighter';
  const sheen = context.createLinearGradient(0, BODY_TEXTURE_HEIGHT * 0.2, 0, BODY_TEXTURE_HEIGHT);
  sheen.addColorStop(0, 'rgba(255,255,255,0.25)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.2)');
  context.fillStyle = sheen;
  context.fillRect(0, BODY_TEXTURE_HEIGHT * 0.2, canvas.width, BODY_TEXTURE_HEIGHT * 0.8);

  const texture = Texture.from(canvas);
  texture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
  cachedBodyTexture = texture;
  return texture;
}

function createOverlayTexture() {
  if (cachedOverlayTexture) {
    return cachedOverlayTexture;
  }
  const ctxResult = ensureCanvasContext(256, BODY_TEXTURE_HEIGHT);
  if (!ctxResult) {
    return Texture.WHITE;
  }
  const { canvas, context } = ctxResult;
  const gradient = context.createLinearGradient(0, 0, 0, BODY_TEXTURE_HEIGHT);
  gradient.addColorStop(0, 'rgba(255,140,140,0.05)');
  gradient.addColorStop(0.2, 'rgba(255,120,120,0.35)');
  gradient.addColorStop(0.5, 'rgba(255,180,180,0.55)');
  gradient.addColorStop(0.8, 'rgba(255,120,120,0.35)');
  gradient.addColorStop(1, 'rgba(255,140,140,0.05)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = Texture.from(canvas);
  texture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
  cachedOverlayTexture = texture;
  return texture;
}

function createHeadTexture() {
  if (cachedHeadTexture) {
    return cachedHeadTexture;
  }
  const ctxResult = ensureCanvasContext(HEAD_TEXTURE_BASE, HEAD_TEXTURE_BASE);
  if (!ctxResult) {
    return Texture.WHITE;
  }
  const { canvas, context } = ctxResult;
  context.translate(HEAD_TEXTURE_BASE / 2, HEAD_TEXTURE_BASE / 2);
  context.beginPath();
  context.moveTo(HEAD_TEXTURE_BASE / 2 - 4, 0);
  context.lineTo(-HEAD_TEXTURE_BASE / 2 + 12, -HEAD_TEXTURE_BASE / 3);
  context.lineTo(-HEAD_TEXTURE_BASE / 2 + 12, HEAD_TEXTURE_BASE / 3);
  context.closePath();
  const gradient = context.createLinearGradient(-HEAD_TEXTURE_BASE / 2, 0, HEAD_TEXTURE_BASE / 2, 0);
  gradient.addColorStop(0, '#5a0f0d');
  gradient.addColorStop(0.35, '#9f1d19');
  gradient.addColorStop(0.7, '#ff6e65');
  gradient.addColorStop(1, '#ffd0cd');
  context.fillStyle = gradient;
  context.fill();

  const texture = Texture.from(canvas);
  cachedHeadTexture = texture;
  return texture;
}

function createSparkTexture() {
  if (cachedSparkTexture) {
    return cachedSparkTexture;
  }
  const size = 32;
  const ctxResult = ensureCanvasContext(size, size);
  if (!ctxResult) {
    return Texture.WHITE;
  }
  const { canvas, context } = ctxResult;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,200,200,0.95)');
  gradient.addColorStop(0.35, 'rgba(255,140,140,0.5)');
  gradient.addColorStop(1, 'rgba(255,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = Texture.from(canvas);
  cachedSparkTexture = texture;
  return texture;
}

function createRopeMesh(texture: Texture): RopeMeshState {
  const vertexPairs = SAMPLE_COUNT * 2;
  const positions = new Float32Array(vertexPairs * 2);
  const uvs = new Float32Array(vertexPairs * 2);
  const baseU = new Float32Array(vertexPairs);

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const offset = i * 4;
    // top vertex V coordinate
    uvs[offset + 1] = 0;
    // bottom vertex V coordinate
    uvs[offset + 3] = 1;
  }

  const geometry = new Geometry()
    .addAttribute('aVertexPosition', positions, 2)
    .addAttribute('aTextureCoord', uvs, 2);
  geometry.topology = DRAW_MODES.TRIANGLE_STRIP;

  texture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
  const mesh = new Mesh({ geometry, texture });
  mesh.renderable = true;
  mesh.blendMode = BLEND_MODES.NORMAL;

  return {
    mesh,
    geometry,
    positions,
    uvs,
    baseU
  };
}

function destroyRopeMesh(state: RopeMeshState | null, container: Container | null) {
  if (!state) {
    return;
  }
  if (state.mesh.parent && state.mesh.parent === container) {
    container?.removeChild(state.mesh);
  }
  state.geometry.destroy();
  state.mesh.destroy();
}

function createFallbackState(): FallbackState {
  const graphics = new Graphics();
  const overlay = new Sprite(createOverlayTexture());
  overlay.anchor.set(0.5, 0.5);
  overlay.blendMode = BLEND_MODES.ADD;
  overlay.alpha = 0.45;
  overlay.visible = false;
  return { graphics, overlay };
}

function destroyFallbackState(state: FallbackState | null, container: Container | null) {
  if (!state) {
    return;
  }
  if (state.graphics.parent && state.graphics.parent === container) {
    container?.removeChild(state.graphics);
  }
  if (state.overlay.parent && state.overlay.parent === container) {
    container?.removeChild(state.overlay);
  }
  state.graphics.destroy();
  state.overlay.destroy();
}

function createSparkState(): SparkState {
  const container = new ParticleContainer(SPARK_COUNT, {
    scale: true,
    alpha: true,
    position: true
  });
  container.blendMode = BLEND_MODES.ADD;
  const texture = createSparkTexture();
  const particles: SparkParticle[] = [];
  for (let i = 0; i < SPARK_COUNT; i++) {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.alpha = 0;
    container.addChild(sprite);
    particles.push({ sprite, life: 0, ttl: 0.3, vx: 0, vy: 0 });
  }
  return { container, particles, spawnAccumulator: 0 };
}

function destroySparkState(state: SparkState | null, container: Container | null) {
  if (!state) {
    return;
  }
  if (state.container.parent && state.container.parent === container) {
    container?.removeChild(state.container);
  }
  state.container.destroy({ children: true });
}

function computeCurve(
  source: Point,
  tip: Point,
  maxBend: number,
  points: PixiPoint[],
  tangents: PixiPoint[],
  normals: PixiPoint[],
  distances: number[]
) {
  const dx = tip.x - source.x;
  const dy = tip.y - source.y;
  const baseLength = Math.hypot(dx, dy);
  const resolvedMaxBend = clamp(maxBend, 0, 1);
  const baseNormalX = baseLength > 0 ? -dy / baseLength : 0;
  const baseNormalY = baseLength > 0 ? dx / baseLength : -1;
  let nx = baseNormalX;
  let ny = baseNormalY;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }

  const lift = baseLength * 0.12 * resolvedMaxBend;
  const k1 = baseLength * 0.25 * resolvedMaxBend;
  const k2 = baseLength * 0.18 * resolvedMaxBend;
  const control1 = {
    x: source.x + nx * k1,
    y: source.y + ny * k1 - lift
  };
  const control2 = {
    x: tip.x + nx * k2,
    y: tip.y + ny * k2 - lift * 0.6
  };

  let prevX = source.x;
  let prevY = source.y;
  let accumulated = 0;
  const inv = SAMPLE_COUNT > 1 ? 1 / (SAMPLE_COUNT - 1) : 1;
  const baseNormalDotReference = nx * nx + ny * ny;
  let lastTangentX = dx;
  let lastTangentY = dy;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i * inv;
    const omt = 1 - t;
    const omt2 = omt * omt;
    const t2 = t * t;
    const omt3 = omt2 * omt;
    const t3 = t2 * t;
    const x =
      omt3 * source.x +
      3 * omt2 * t * control1.x +
      3 * omt * t2 * control2.x +
      t3 * tip.x;
    const y =
      omt3 * source.y +
      3 * omt2 * t * control1.y +
      3 * omt * t2 * control2.y +
      t3 * tip.y;
    points[i].set(x, y);

    const dxdt =
      3 * omt2 * (control1.x - source.x) +
      6 * omt * t * (control2.x - control1.x) +
      3 * t2 * (tip.x - control2.x);
    const dydt =
      3 * omt2 * (control1.y - source.y) +
      6 * omt * t * (control2.y - control1.y) +
      3 * t2 * (tip.y - control2.y);
    let tanX = dxdt;
    let tanY = dydt;
    let magnitude = Math.hypot(tanX, tanY);
    if (magnitude < 1e-3) {
      if (i > 0) {
        tanX = tangents[i - 1].x;
        tanY = tangents[i - 1].y;
        magnitude = Math.hypot(tanX, tanY);
      } else if (baseLength > 0) {
        tanX = dx / baseLength;
        tanY = dy / baseLength;
        magnitude = 1;
      } else {
        tanX = 1;
        tanY = 0;
        magnitude = 1;
      }
    }
    tanX /= magnitude;
    tanY /= magnitude;
    tangents[i].set(tanX, tanY);

    let normalX = -tanY;
    let normalY = tanX;
    const dot = normalX * nx + normalY * ny;
    if (dot < 0 && baseNormalDotReference > 0) {
      normalX = -normalX;
      normalY = -normalY;
    }
    normals[i].set(normalX, normalY);

    if (i === 0) {
      distances[i] = 0;
    } else {
      const segmentLength = Math.hypot(x - prevX, y - prevY);
      accumulated += segmentLength;
      distances[i] = accumulated;
    }
    prevX = x;
    prevY = y;
    lastTangentX = tanX;
    lastTangentY = tanY;
  }

  return {
    length: accumulated,
    endTangent: { x: lastTangentX, y: lastTangentY }
  } as const;
}

function updateRopeGeometry(
  rope: RopeMeshState,
  points: PixiPoint[],
  normals: PixiPoint[],
  distances: number[],
  totalLength: number,
  thickness: number,
  uvOffset: number
) {
  const halfThickness = thickness / 2;
  const positions = rope.positions;
  const uvs = rope.uvs;
  const baseU = rope.baseU;
  const bufferPositions = rope.geometry.getBuffer('aVertexPosition');
  const bufferUvs = rope.geometry.getBuffer('aTextureCoord');
  const safeLength = totalLength <= 0 ? 1 : totalLength;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const point = points[i];
    const normal = normals[i];
    const baseIndex = i * 4;
    const distanceRatio = distances[i] / safeLength;
    baseU[i * 2] = distanceRatio;
    baseU[i * 2 + 1] = distanceRatio;

    positions[baseIndex] = point.x + normal.x * halfThickness;
    positions[baseIndex + 1] = point.y + normal.y * halfThickness;
    positions[baseIndex + 2] = point.x - normal.x * halfThickness;
    positions[baseIndex + 3] = point.y - normal.y * halfThickness;

    uvs[baseIndex] = distanceRatio + uvOffset;
    uvs[baseIndex + 1] = 0;
    uvs[baseIndex + 2] = distanceRatio + uvOffset;
    uvs[baseIndex + 3] = 1;
  }

  bufferPositions?.update(positions);
  bufferUvs?.update(uvs);
}

function drawFallbackBody(
  fallback: FallbackState,
  points: PixiPoint[],
  tangents: PixiPoint[],
  thickness: number,
  valid: boolean,
  alpha: number
) {
  const graphics = fallback.graphics;
  graphics.clear();
  const color = valid ? 0xe03f35 : 0x8a1c1c;
  const lineAlpha = valid ? 0.95 : 0.75;
  graphics.lineStyle({
    width: thickness,
    color,
    alpha: lineAlpha * alpha,
    cap: 'round',
    join: 'round'
  });
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < SAMPLE_COUNT; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }
  graphics.endFill();

  const overlay = fallback.overlay;
  const midIndex = Math.floor(SAMPLE_COUNT / 2);
  overlay.visible = true;
  overlay.position.set(points[midIndex].x, points[midIndex].y);
  const tangent = tangents[midIndex];
  overlay.rotation = Math.atan2(tangent.y, tangent.x);
  const lengthEstimate = Math.max(1, Math.hypot(points[SAMPLE_COUNT - 1].x - points[0].x, points[SAMPLE_COUNT - 1].y - points[0].y));
  overlay.width = lengthEstimate * 1.05;
  overlay.height = thickness * 1.4;
  overlay.tint = valid ? 0xffd5c8 : 0x551010;
  overlay.alpha = (valid ? 0.4 : 0.22) * alpha;
}

function updateOverlayForRope(
  overlay: Sprite | null,
  points: PixiPoint[],
  tangents: PixiPoint[],
  thickness: number,
  alpha: number,
  valid: boolean
) {
  if (!overlay) {
    return;
  }
  const midIndex = Math.floor(SAMPLE_COUNT / 2);
  overlay.visible = true;
  overlay.position.set(points[midIndex].x, points[midIndex].y);
  const tangent = tangents[midIndex];
  overlay.rotation = Math.atan2(tangent.y, tangent.x);
  const chord = Math.max(1, Math.hypot(points[SAMPLE_COUNT - 1].x - points[0].x, points[SAMPLE_COUNT - 1].y - points[0].y));
  overlay.width = chord * 1.05;
  overlay.height = thickness * 1.35;
  overlay.tint = valid ? 0xffe4dc : 0x401010;
  overlay.alpha = (valid ? 0.32 : 0.18) * alpha;
}

function updateSparkState(
  state: SparkState | null,
  dt: number,
  tip: Point,
  tangent: Point,
  thickness: number,
  alpha: number,
  valid: boolean
) {
  if (!state) {
    return;
  }
  const container = state.container;
  container.visible = alpha > 0.1;
  if (!container.visible) {
    return;
  }
  container.position.set(tip.x, tip.y);
  container.rotation = Math.atan2(tangent.y, tangent.x);
  state.spawnAccumulator += dt * (valid ? 18 : 9);
  const normalX = -tangent.y;
  const normalY = tangent.x;

  while (state.spawnAccumulator > 1) {
    state.spawnAccumulator -= 1;
    const particle = state.particles.find((p) => p.life <= 0);
    if (!particle) {
      break;
    }
    const scatter = (Math.random() - 0.5) * thickness * 0.6;
    particle.sprite.position.set(Math.random() * 4 - 2, scatter);
    particle.life = Math.random() * 0.1 + 0.25;
    particle.ttl = particle.life;
    const speed = valid ? 260 + Math.random() * 80 : 190 + Math.random() * 60;
    const lateral = (Math.random() - 0.5) * 60;
    particle.vx = tangent.x * speed + normalX * lateral;
    particle.vy = tangent.y * speed + normalY * lateral;
    particle.sprite.alpha = 1;
    particle.sprite.scale.set(valid ? 0.4 : 0.32);
  }

  for (const particle of state.particles) {
    if (particle.life <= 0) {
      particle.sprite.alpha = 0;
      continue;
    }
    particle.life -= dt;
    const lifeRatio = clamp(particle.life / particle.ttl, 0, 1);
    particle.sprite.alpha = lifeRatio * alpha;
    particle.sprite.x += particle.vx * dt;
    particle.sprite.y += particle.vy * dt;
    particle.sprite.scale.set((valid ? 0.45 : 0.35) * (0.6 + 0.4 * lifeRatio));
  }
}

export default function TargetArrow({
  isAiming,
  source,
  cursor,
  valid,
  onCancel,
  maxBend = DEFAULT_MAX_BEND,
  thickness = DEFAULT_THICKNESS,
  headSize = DEFAULT_HEAD_SIZE,
  glow = true,
  textureUrl,
  mode = 'rope',
  snapPoint = null
}: TargetArrowProps) {
  const containerRef = useRef<Container | null>(null);
  const ropeStateRef = useRef<RopeMeshState | null>(null);
  const fallbackStateRef = useRef<FallbackState | null>(null);
  const sparkStateRef = useRef<SparkState | null>(null);
  const headRef = useRef<Sprite | null>(null);
  const overlayRef = useRef<Sprite | null>(null);
  const glowFilterRef = useRef<BlurFilter | null>(null);
  const animationRef = useRef<AnimationState>({
    alpha: 0,
    scale: 0.85,
    uvOffset: 0,
    pulseTime: 0,
    invalidPhase: 0
  });
  const tipRef = useRef(new PixiPoint(cursor.x, cursor.y));
  const pointsRef = useRef<PixiPoint[]>([]);
  const tangentsRef = useRef<PixiPoint[]>([]);
  const normalsRef = useRef<PixiPoint[]>([]);
  const distancesRef = useRef<number[]>([]);
  const [containerToken, setContainerToken] = useState(0);

  if (pointsRef.current.length !== SAMPLE_COUNT) {
    pointsRef.current = Array.from({ length: SAMPLE_COUNT }, () => new PixiPoint());
    tangentsRef.current = Array.from({ length: SAMPLE_COUNT }, () => new PixiPoint());
    normalsRef.current = Array.from({ length: SAMPLE_COUNT }, () => new PixiPoint());
    distancesRef.current = Array.from({ length: SAMPLE_COUNT }, () => 0);
  }

  useEffect(() => {
    tipRef.current.set(cursor.x, cursor.y);
  }, [cursor.x, cursor.y]);

  const resolvedTexture = useMemo(() => {
    if (textureUrl) {
      const texture = Texture.from(textureUrl);
      texture.baseTexture.wrapMode = WRAP_MODES.REPEAT;
      return texture;
    }
    return createBodyTexture();
  }, [textureUrl]);

  const handleContainerRef = useCallback((instance: Container | null) => {
    if (instance) {
      instance.eventMode = 'none';
      instance.visible = false;
      containerRef.current = instance;
      setContainerToken((token) => token + 1);
    } else {
      destroyRopeMesh(ropeStateRef.current, containerRef.current);
      destroyFallbackState(fallbackStateRef.current, containerRef.current);
      destroySparkState(sparkStateRef.current, containerRef.current);
      headRef.current?.destroy();
      overlayRef.current?.destroy();
      glowFilterRef.current?.destroy();
      ropeStateRef.current = null;
      fallbackStateRef.current = null;
      sparkStateRef.current = null;
      headRef.current = null;
      overlayRef.current = null;
      glowFilterRef.current = null;
      containerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const head = new Sprite(createHeadTexture());
    head.anchor.set(0.5);
    head.alpha = 0;
    container.addChild(head);
    headRef.current = head;

    const overlay = new Sprite(createOverlayTexture());
    overlay.anchor.set(0.5, 0.5);
    overlay.blendMode = BLEND_MODES.ADD;
    overlay.alpha = 0.25;
    overlay.visible = false;
    container.addChild(overlay);
    overlayRef.current = overlay;

    const sparkState = createSparkState();
    container.addChild(sparkState.container);
    sparkStateRef.current = sparkState;

    return () => {
      if (head.parent === container) {
        container.removeChild(head);
      }
      head.destroy();
      headRef.current = null;

      if (overlay.parent === container) {
        container.removeChild(overlay);
      }
      overlay.destroy();
      overlayRef.current = null;

      destroySparkState(sparkStateRef.current, container);
      sparkStateRef.current = null;
    };
  }, [containerToken]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (mode === 'rope') {
      if (fallbackStateRef.current) {
        destroyFallbackState(fallbackStateRef.current, container);
        fallbackStateRef.current = null;
      }
      if (overlayRef.current) {
        overlayRef.current.visible = false;
      }
      const existing = ropeStateRef.current;
      if (existing) {
        if (existing.mesh.parent !== container) {
          container.addChildAt(existing.mesh, 0);
        }
        existing.mesh.texture = resolvedTexture;
      } else {
        const ropeState = createRopeMesh(resolvedTexture);
        container.addChildAt(ropeState.mesh, 0);
        ropeStateRef.current = ropeState;
      }
    } else {
      if (ropeStateRef.current) {
        const mesh = ropeStateRef.current.mesh;
        if (mesh.parent === container) {
          container.removeChild(mesh);
        }
      }
      if (overlayRef.current) {
        overlayRef.current.visible = false;
      }
      if (!fallbackStateRef.current) {
        const fallback = createFallbackState();
        container.addChildAt(fallback.graphics, 0);
        container.addChildAt(fallback.overlay, 1);
        fallbackStateRef.current = fallback;
      } else {
        const fallback = fallbackStateRef.current;
        if (fallback.graphics.parent !== container) {
          container.addChildAt(fallback.graphics, 0);
        }
        if (fallback.overlay.parent !== container) {
          container.addChildAt(fallback.overlay, 1);
        }
      }
    }
  }, [containerToken, mode, resolvedTexture]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (!glow) {
      if (glowFilterRef.current && container.filters) {
        container.filters = container.filters.filter((filter) => filter !== glowFilterRef.current);
      }
      return;
    }
    if (!glowFilterRef.current) {
      const blur = new BlurFilter();
      blur.blur = 2;
      blur.repeatEdgePixels = true;
      glowFilterRef.current = blur;
    }
    const filters = container.filters ? container.filters.filter((filter) => filter !== glowFilterRef.current) : [];
    filters.push(glowFilterRef.current);
    container.filters = filters;
  }, [glow, containerToken]);

  useEffect(() => {
    if (!isAiming) {
      animationRef.current.invalidPhase = 0;
    }
  }, [isAiming]);

  useTick((delta) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const dt = delta / 60;
    const anim = animationRef.current;
    const targetAlpha = isAiming ? 1 : 0;
    const targetScale = isAiming ? 1 : 0.85;
    anim.alpha = approach(anim.alpha, targetAlpha, isAiming ? 14 : 18, dt);
    anim.scale = approach(anim.scale, targetScale, 12, dt);

    if (anim.alpha < 0.01 && !isAiming) {
      container.visible = false;
      return;
    }
    container.visible = true;
    container.alpha = anim.alpha;

    const targetPoint = valid && snapPoint ? snapPoint : cursor;
    const tip = tipRef.current;
    const stiffness = valid ? 18 : 11;
    tip.x = approach(tip.x, targetPoint.x, stiffness, dt);
    tip.y = approach(tip.y, targetPoint.y, stiffness, dt);

    let jitterX = 0;
    let jitterY = 0;
    if (isAiming && !valid) {
      anim.invalidPhase += dt * 18;
      jitterX = Math.sin(anim.invalidPhase * 1.7) * 2.4;
      jitterY = Math.sin(anim.invalidPhase * 2.3 + Math.PI / 4) * 1.8;
    }

    const effectiveTip = { x: tip.x + jitterX, y: tip.y + jitterY };
    const { length, endTangent } = computeCurve(
      source,
      effectiveTip,
      maxBend,
      pointsRef.current,
      tangentsRef.current,
      normalsRef.current,
      distancesRef.current
    );

    const dynamicThickness = clamp(
      (thickness + length * 0.02) * (0.85 + (anim.scale - 0.85) * 0.7),
      10,
      22
    );

    const rope = ropeStateRef.current;
    if (mode === 'rope' && rope) {
      const flowSpeed = valid ? 1.6 : 2.4;
      anim.uvOffset += dt * flowSpeed;
      if (!valid) {
        anim.uvOffset += Math.sin(anim.invalidPhase * 4) * 0.02;
      }
      if (anim.uvOffset > 10 || anim.uvOffset < -10) {
        anim.uvOffset -= Math.trunc(anim.uvOffset);
      }
      updateRopeGeometry(
        rope,
        pointsRef.current,
        normalsRef.current,
        distancesRef.current,
        Math.max(length, 1),
        dynamicThickness,
        anim.uvOffset
      );
      rope.mesh.tint = valid ? 0xffffff : 0xc44840;
      rope.mesh.alpha = valid ? 1 : 0.85;
      updateOverlayForRope(
        overlayRef.current,
        pointsRef.current,
        tangentsRef.current,
        dynamicThickness,
        anim.alpha,
        valid
      );
    }

    const fallback = fallbackStateRef.current;
    if (mode === 'graphics' && fallback) {
      drawFallbackBody(
        fallback,
        pointsRef.current,
        tangentsRef.current,
        dynamicThickness,
        valid,
        anim.alpha
      );
    }

    const head = headRef.current;
    if (head) {
      const baseScale = (headSize / HEAD_TEXTURE_BASE) * (0.9 + anim.scale * 0.1);
      if (valid) {
        anim.pulseTime += dt * 6.2;
      } else {
        anim.pulseTime = approach(anim.pulseTime, 0, 4, dt);
      }
      const pulse = valid ? 0.05 * Math.sin(anim.pulseTime) : 0;
      const brightness = valid ? 0xffa0a0 : 0xff6666;
      head.tint = brightness;
      head.position.set(effectiveTip.x, effectiveTip.y);
      head.rotation = Math.atan2(endTangent.y, endTangent.x);
      const validBoost = valid ? 1.12 : 0.96;
      head.scale.set(baseScale * validBoost * (1 + pulse));
      head.alpha = anim.alpha * (valid ? 1 : 0.85);
    }

    if (glow && glowFilterRef.current) {
      const blur = glowFilterRef.current;
      blur.blur = 2 + anim.scale * (valid ? 2.8 : 1.6);
    }

    updateSparkState(
      sparkStateRef.current,
      dt,
      effectiveTip,
      endTangent,
      dynamicThickness,
      anim.alpha,
      valid
    );
  }, [cursor, glow, headSize, isAiming, maxBend, mode, snapPoint, source, thickness, valid]);

  useEffect(() => {
    if (!isAiming) {
      return;
    }
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('keydown', cancel);
    };
  }, [isAiming, onCancel]);

  return <pixiContainer ref={handleContainerRef} eventMode="none" />;
}

