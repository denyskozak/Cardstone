import React, { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
};

export const MagicCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx = context;

    const particles: Particle[] = [];

    const resize = () => {
      const target = ctx.canvas;
      target.width = window.innerWidth;
      target.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const createParticles = (event: MouseEvent) => {
      const hue = 201; // approx #299ad8
      for (let i = 0; i < 5; i++) {
        const saturation = 70 + Math.random() * 10;
        const lightness = 55 + Math.random() * 10;
        particles.push({
          x: event.clientX,
          y: event.clientY,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          alpha: 1,
          size: 2 + Math.random() * 3,
          color: `hsl(${hue},${saturation}%,${lightness}%)`,
        });
      }
    };

    window.addEventListener("mousemove", createParticles);

    let last = performance.now();
    let animationFrame = 0;

    function frame(time: number) {
      const dt = (time - last) / 1000;
      last = time;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.alpha -= dt;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      animationFrame = requestAnimationFrame(frame);
    }

    animationFrame = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("mousemove", createParticles);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[1]"
    />
  );
};
