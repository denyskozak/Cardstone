import { Graphics } from '@pixi/react';

interface BackgroundProps {
  width: number;
  height: number;
}

export default function Background({ width, height }: BackgroundProps) {
  return (
    <Graphics
      draw={(g) => {
        g.clear();
        g.beginFill(0x2d3436);
        g.drawRect(0, 0, width, height);
        g.endFill();
        g.beginFill(0x3e2723, 0.5);
        g.drawRoundedRect(32, 32, width - 64, height - 64, 24);
        g.endFill();
      }}
    />
  );
}
