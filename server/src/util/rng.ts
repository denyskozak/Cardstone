import { randomBytes } from 'node:crypto';
import seedrandom from 'seedrandom';

export type RNG = ReturnType<typeof seedrandom>;

export function createSeed(): string {
  return randomBytes(16).toString('hex');
}

export function createRng(seed: string): RNG {
  return seedrandom(seed, { state: true });
}

export function shuffleInPlace<T>(items: T[], rng: RNG): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function pick<T>(items: readonly T[], rng: RNG): T {
  if (!items.length) {
    throw new Error('Cannot pick from empty array');
  }
  const index = Math.floor(rng() * items.length);
  return items[index];
}
