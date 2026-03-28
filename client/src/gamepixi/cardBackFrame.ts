import { Texture } from 'pixi.js';
import { CARD_SIZE } from './Card';

export interface CardBackFrame {
  width: number;
  height: number;
  x: number;
  y: number;
}

const TARGET_RATIO = CARD_SIZE.width / CARD_SIZE.height;

export function getCardBackFrame(texture: Texture): CardBackFrame {
  const sourceWidth = texture === Texture.EMPTY ? CARD_SIZE.width : texture.width;
  const sourceHeight = texture === Texture.EMPTY ? CARD_SIZE.height : texture.height;
  const sourceRatio = sourceWidth / sourceHeight;

  if (sourceRatio > TARGET_RATIO) {
    const width = CARD_SIZE.width;
    const fittedHeight = width / sourceRatio;
    return {
      width,
      height: fittedHeight,
      x: 0,
      y: (CARD_SIZE.height - fittedHeight) / 2
    };
  }

  const height = CARD_SIZE.height;
  const fittedWidth = height * sourceRatio;
  return {
    width: fittedWidth,
    height,
    x: (CARD_SIZE.width - fittedWidth) / 2,
    y: 0
  };
}
