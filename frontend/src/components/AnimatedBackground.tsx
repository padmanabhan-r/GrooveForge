import { useEffect, useRef, useMemo } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
}

interface AuroraStrip {
  y: number;
  speed: number;
  opacity: number;
  hue: number;
}

export default function AnimatedBackground({ isPlaying = false }: { isPlaying?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 100 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const auroras = useMemo<AuroraStrip[]>(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      y: 0.8 + Math.random() * 0.3,
      speed: 0.008 + Math.random() * 0.006,
      opacity: 0.02 + Math.random() * 0.03,
      hue: 250 + Math.random() * 30,
    }));
  }, []);

  // Waveform bars for the bottom
  const barCount = 64;

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

      // Layer 2 — Animated radial bloom
      const bloomX = w * (0.4 + 0.2 * Math.sin(t * 0.08));
      const bloomY = h * (0.3 + 0.15 * Math.cos(t * 0.06));
      const bloomR = Math.min(w, h) * 0.6;
      const bloomGrad = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, bloomR);
      bloomGrad.addColorStop(0, `hsla(260, 70%, 30%, ${0.08 + 0.03 * Math.sin(t * 0.12)})`);
      bloomGrad.addColorStop(0.5, 'hsla(260, 60%, 20%, 0.04)');
      bloomGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bloomGrad;
      ctx.fillRect(0, 0, w, h);

      // Second bloom for depth
      const b2x = w * (0.6 + 0.15 * Math.cos(t * 0.05));
      const b2y = h * (0.6 + 0.1 * Math.sin(t * 0.07));
      const b2Grad = ctx.createRadialGradient(b2x, b2y, 0, b2x, b2y, bloomR * 0.7);
      b2Grad.addColorStop(0, `hsla(280, 60%, 25%, ${0.05 + 0.02 * Math.sin(t * 0.1)})`);
      b2Grad.addColorStop(1, 'transparent');
      ctx.fillStyle = b2Grad;
      ctx.fillRect(0, 0, w, h);

      // Layer 5 — Aurora drift
      auroras.forEach(a => {
        a.y -= a.speed * 0.016;
        if (a.y < -0.1) a.y = 1.1;
        const ay = a.y * h;
        const aGrad = ctx.createLinearGradient(0, ay - 40, 0, ay + 40);
        const ao = a.opacity * (0.7 + 0.3 * Math.sin(t * 0.2 + a.hue));
        aGrad.addColorStop(0, 'transparent');
        aGrad.addColorStop(0.5, `hsla(${a.hue}, 60%, 30%, ${ao})`);
        aGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = aGrad;
        ctx.fillRect(0, ay - 40, w, 80);
      });

      // Layer 3 — Floating particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const flicker = p.opacity * (0.6 + 0.4 * Math.sin(t * 1.5 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * window.devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(240, 30%, 80%, ${flicker})`;
        ctx.fill();
      });

      // Layer 4 — Ambient waveform bars at bottom
      const barWidth = w / barCount;
      const maxBarH = h * (isPlaying ? 0.08 : 0.025);
      ctx.save();
      for (let i = 0; i < barCount; i++) {
        const freq = isPlaying
          ? Math.sin(t * 3 + i * 0.3) * 0.5 + Math.sin(t * 5 + i * 0.7) * 0.3 + 0.5
          : Math.sin(t * 0.8 + i * 0.2) * 0.3 + 0.4;
        const barH = maxBarH * freq;
        const x = i * barWidth;
        const gradient = ctx.createLinearGradient(x, h, x, h - barH);
        gradient.addColorStop(0, `hsla(255, 80%, 60%, ${isPlaying ? 0.25 : 0.06})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, h - barH, barWidth - 1, barH);
      }
      ctx.restore();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [particles, auroras, isPlaying]);

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
