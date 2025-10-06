declare module '@pixi/particle-emitter' {
  import type { Container } from 'pixi.js';

  export class Emitter {
    constructor(container: Container, config: unknown);
    emit: boolean;
    particleCount: number;
    cleanup(): void;
    destroy(): void;
    resetPositionTracking(): void;
    updateOwnerPos(x: number, y: number): void;
    update(delta: number): void;
  }
}
