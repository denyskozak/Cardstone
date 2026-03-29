import type { PlayerSide } from '@cardstone/shared/types';
import { useEffect, useMemo, useState } from 'react';
import { Assets, Texture } from 'pixi.js';
import { CARD_SIZE } from '../Card';
import { DECK_SCALE, DECK_STACK_COUNT, DECK_STACK_OFFSET, getDeckPositions } from '../layout';
import { getCardBackFrame } from '../cardBackFrame';

interface DecksLayerProps {
  playerSide: PlayerSide;
  playerCount: number;
  opponentCount: number;
  width: number;
  height: number;
}

const CARD_BACK_TEXTURE = '/assets/card_skins/1.webp';
const TOOLTIP_PADDING_X = 12;
const TOOLTIP_PADDING_Y = 6;
const TOOLTIP_HEIGHT = 28;

function getTooltipWidth(text: string) {
  return Math.max(90, text.length * 7 + TOOLTIP_PADDING_X * 2);
}

export default function DecksLayer({
  playerSide,
  playerCount,
  opponentCount,
  width,
  height
}: DecksLayerProps) {
  const [texture, setTexture] = useState(Texture.EMPTY);
  const [hoveredSide, setHoveredSide] = useState<PlayerSide | null>(null);

  useEffect(() => {
    if (texture !== Texture.EMPTY) {
      return;
    }
    let cancelled = false;
    Assets.load(CARD_BACK_TEXTURE).then((result) => {
      if (!cancelled) {
        setTexture(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [texture]);

  const deckPositions = useMemo(() => getDeckPositions(width, height), [width, height]);
  const cardBackFrame = useMemo(() => getCardBackFrame(texture), [texture]);
  const opponentSide: PlayerSide = playerSide === 'A' ? 'B' : 'A';

  const decks = [
    { side: playerSide, count: playerCount, position: deckPositions.player },
    { side: opponentSide, count: opponentCount, position: deckPositions.opponent }
  ];

  return (
    // Слой обоих "стеков" колод (игрок и оппонент).
    <pixiContainer sortableChildren>
      {decks.map((deck) => {
        const tooltipText = `Deck: ${deck.count}`;
        const tooltipWidth = getTooltipWidth(tooltipText);
        return (
          // Контейнер одной колоды (позиция + hover для тултипа количества карт).
          <pixiContainer
            key={deck.side}
            x={deck.position.x}
            y={deck.position.y}
            eventMode="static"
            cursor="pointer"
            onPointerOver={() => setHoveredSide(deck.side)}
            onPointerOut={() => setHoveredSide(null)}
            zIndex={200}
          >
            {Array.from({ length: DECK_STACK_COUNT }, (_, index) => (
              // Визуальный слой рубашки для создания эффекта "стопки" колоды.
              <pixiContainer
                key={index}
                pivot={{ x: CARD_SIZE.width / 2, y: CARD_SIZE.height }}
                x={DECK_STACK_OFFSET.x * index}
                y={DECK_STACK_OFFSET.y * index}
                scale={DECK_SCALE}
              >
                <pixiSprite
                  texture={texture}
                  width={cardBackFrame.width}
                  height={cardBackFrame.height}
                  x={cardBackFrame.x}
                  y={cardBackFrame.y}
                />
              </pixiContainer>
            ))}
            {hoveredSide === deck.side ? (
              // Tooltip колоды: фон через pixiGraphics + текст счётчика.
              <pixiContainer
                x={CARD_SIZE.width * DECK_SCALE * 0.55}
                y={-CARD_SIZE.height * DECK_SCALE - 24}
                zIndex={300}
              >
                <pixiGraphics
                  draw={(g) => {
                    g.clear();
                    g.beginFill(0x1c1c1c, 0.9);
                    g.drawRoundedRect(0, 0, tooltipWidth, TOOLTIP_HEIGHT, 8);
                    g.endFill();
                  }}
                />
                <pixiText
                  text={tooltipText}
                  x={TOOLTIP_PADDING_X}
                  y={TOOLTIP_PADDING_Y}
                  style={{ fill: 0xffffff, fontSize: 14, fontWeight: 'bold' }}
                />
              </pixiContainer>
            ) : null}
          </pixiContainer>
        );
      })}
    </pixiContainer>
  );
}
