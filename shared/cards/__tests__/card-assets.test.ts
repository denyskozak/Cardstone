import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { DEMO_CARD_POOL } from '../demo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cardsDir = resolve(__dirname, '../../../client/assets/cards');

describe('card assets', () => {
  it('has artwork for every demo card', () => {
    const missing = DEMO_CARD_POOL.filter((card) => {
      const assetPath = resolve(cardsDir, `${card.id}.webp`);
      return !fs.existsSync(assetPath);
    });

    expect(missing).toEqual([]);
  });

  it('does not contain unused artwork', () => {
    const cardFiles = new Set(
      fs.readdirSync(cardsDir).filter((file) => file.endsWith('.webp'))
    );

    for (const card of DEMO_CARD_POOL) {
      cardFiles.delete(`${card.id}.webp`);
    }

    expect([...cardFiles]).toEqual([]);
  });
});
