interface BackgroundProps {
  width: number;
  height: number;
}

export default function Background({ width, height }: BackgroundProps) {
  const deckWidth = 1100;
  const deckHeight = 650;
  const deckX = (width - deckWidth) / 2;
  const deckY = (height - deckHeight) / 2;

  return (
    <>
      <pixiSprite image="/assets/board_template.webp" width={width} height={height} />
      <pixiSprite
        image="/assets/deck_template.webp"
        width={deckWidth}
        height={deckHeight}
        x={deckX}
        y={deckY}
      />
    </>
  );
}
