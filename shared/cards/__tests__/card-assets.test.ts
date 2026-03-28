import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DEMO_CARD_POOL } from '../demo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsDir = resolve(__dirname, '../../../client/assets/cards');

function collectWebpFilesRecursively(rootDir: string, currentDir = rootDir): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = resolve(currentDir, entry.name);
    if (entry.isDirectory()) {
      return collectWebpFilesRecursively(rootDir, fullPath);
    }
    if (!entry.name.endsWith('.webp')) {
      return [];
    }
    return [fullPath.replace(`${rootDir}/`, '')];
  });
}

describe('card assets', () => {
  it('has artwork for every demo card', () => {
    const missing = DEMO_CARD_POOL.filter((card) => {
      const assetPath = resolve(cardsDir, card.domainId, `${card.id}.webp`);
      return !fs.existsSync(assetPath);
    });

    expect(missing).toEqual([]);
  });

  it('does not contain unused artwork', () => {
    const cardFiles = new Set(collectWebpFilesRecursively(cardsDir));

    for (const card of DEMO_CARD_POOL) {
      cardFiles.delete(`${card.domainId}/${card.id}.webp`);
    }

    expect([...cardFiles]).toEqual([]);
  });
});
