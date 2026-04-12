import { useEffect, useRef, useMemo } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
  hue: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  speed: number;
  opacity: number;
  hue: number;
}

export default function AnimatedBackground({ isPlaying = false }: { isPlaying?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const particles = useMemo<Particle[]>(() => {
    const pw = window.innerWidth  * window.devicePixelRatio;
    const ph = window.innerHeight * window.devicePixelRatio;
    return Array.from({ length: 160 }, () => ({
      x: Math.random() * pw,
      y: Math.random() * ph,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.08,
      size: Math.random() * 2.2 + 0.35,
      opacity: Math.random() * 0.5 + 0.08,
      phase: Math.random() * Math.PI * 2,
      hue: 205 + Math.random() * 35,
    }));
  }, []);

  const nebulas = useMemo<Nebula[]>(() => {
    return Array.from({ length: 4 }, () => ({
      x: 0.16 + Math.random() * 0.68,
      y: 0.14 + Math.random() * 0.64,
      radius: 0.16 + Math.random() * 0.18,
      speed: 0.002 + Math.random() * 0.002,
      opacity: 0.04 + Math.random() * 0.04,
      hue: 205 + Math.random() * 45,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = timeRef.current;
      timeRef.current += 0.016;

      ctx.clearRect(0, 0, w, h);

      const baseGradient = ctx.createLinearGradient(0, 0, 0, h);
      baseGradient.addColorStop(0, 'hsl(230, 42%, 9%)');
      baseGradient.addColorStop(0.48, 'hsl(226, 45%, 7%)');
      baseGradient.addColorStop(1, 'hsl(234, 41%, 4%)');
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, w, h);

      const horizonGlow = ctx.createRadialGradient(w * 0.5, h * 0.92, 0, w * 0.5, h * 0.92, Math.min(w, h) * 0.6);
      horizonGlow.addColorStop(0, 'hsla(222, 70%, 16%, 0.22)');
      horizonGlow.addColorStop(0.45, 'hsla(236, 70%, 10%, 0.12)');
      horizonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, w, h);

      nebulas.forEach((n, index) => {
        const nx = (n.x + Math.sin(t * n.speed + index) * 0.04) * w;
        const ny = (n.y + Math.cos(t * n.speed * 1.4 + index) * 0.03) * h;
        const nr = Math.min(w, h) * n.radius;
        const nebula = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        nebula.addColorStop(0, `hsla(${n.hue}, 70%, 60%, ${n.opacity})`);
        nebula.addColorStop(0.35, `hsla(${n.hue + 20}, 75%, 38%, ${n.opacity * 0.65})`);
        nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, w, h);
      });

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const flicker = p.opacity * (0.6 + 0.4 * Math.sin(t * 1.5 + p.phase));
        const starRadius = p.size * window.devicePixelRatio;
        const starGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, starRadius * 3.2);
        starGlow.addColorStop(0, `hsla(${p.hue}, 90%, 88%, ${flicker})`);
        starGlow.addColorStop(0.35, `hsla(${p.hue}, 85%, 76%, ${flicker * 0.45})`);
        starGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = starGlow;
        ctx.fillRect(p.x - starRadius * 3.2, p.y - starRadius * 3.2, starRadius * 6.4, starRadius * 6.4);

        ctx.beginPath();
        ctx.arc(p.x, p.y, starRadius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 45%, 92%, ${Math.min(1, flicker + 0.1)})`;
        ctx.fill();

        if (p.size > 1.7) {
          ctx.strokeStyle = `hsla(${p.hue}, 80%, 92%, ${flicker * 0.35})`;
          ctx.lineWidth = window.devicePixelRatio * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - starRadius * 2.1, p.y);
          ctx.lineTo(p.x + starRadius * 2.1, p.y);
          ctx.moveTo(p.x, p.y - starRadius * 2.1);
          ctx.lineTo(p.x, p.y + starRadius * 2.1);
          ctx.stroke();
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [particles, nebulas, isPlaying]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />
      {/* Layer 6 — Noise texture overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />
    </>
  );
}
