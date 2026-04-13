import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

// ── Floating music glyphs ──────────────────────────────────────────────────────
const GLYPHS = ['♪', '♫', '𝄞', '♩', '♬', '⚡', '𝄢', '♭', '♯'];

function FloatingGlyph({ glyph, x, y, size, delay, duration }: {
  glyph: string; x: number; y: number; size: number; delay: number; duration: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: `${size}px`, color: 'rgba(180,190,255,0.7)' }}
      animate={{ y: [0, -18, 0], opacity: [0.45, 0.85, 0.45] }}
      transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      {glyph}
    </motion.div>
  );
}

// ── Mini waveform decoration ───────────────────────────────────────────────────
function WaveBar({ height, delay }: { height: number; delay: number }) {
  return (
    <motion.div
      className="w-[3px] rounded-full"
      style={{ background: 'linear-gradient(180deg, #6366f1 0%, #f97316 100%)', height: `${height}px` }}
      animate={{ scaleY: [1, 0.3, 1.4, 0.6, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

// ── Feature pill ──────────────────────────────────────────────────────────────
function Pill({ label }: { label: string }) {
  return (
    <div
      className="px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em]"
      style={{
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.22)',
        color: 'rgba(165,168,255,0.82)',
      }}
    >
      {label}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();

  const glyphs = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      glyph: GLYPHS[i % GLYPHS.length],
      x: 4 + (i * 5.4) % 92,
      y: 6 + (i * 7.1) % 82,
      size: 18 + (i % 4) * 10,
      delay: (i * 0.38) % 4.5,
      duration: 4 + (i % 5) * 0.7,
    }))
  , []);

  const waveBars = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      height: 10 + Math.abs(Math.sin(i * 0.72)) * 32,
      delay: i * 0.07,
    }))
  , []);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#080c18' }}>
      <AnimatedBackground isPlaying={false} />

      {/* Floating music glyphs */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {glyphs.map(g => <FloatingGlyph key={g.id} {...g} />)}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
          className="flex items-center gap-4 mb-6"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <Zap size={28} fill="white" color="white" strokeWidth={0} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="font-black mb-4"
          style={{
            lineHeight: 1.15,
            paddingBottom: '0.12em',
            fontSize: 'clamp(40px, 7.5vw, 76px)',
            letterSpacing: '-0.04em',
            color: '#ffffff',
            textShadow: '0 0 40px rgba(255,255,255,0.25), 0 2px 12px rgba(0,0,0,0.4)',
          }}
        >
          GrooveForge
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="max-w-2xl mb-3 leading-relaxed"
          style={{ fontSize: 'clamp(16px, 2.4vw, 22px)', color: 'rgba(255,255,255,0.62)' }}
        >
          Search through millions of arrangements and compositions and forge your grooves
        </motion.p>

        {/* Sub-tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="mb-10 text-sm uppercase tracking-[0.26em] font-semibold"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          A MUSICIAN'S ULTIMATE ORIGINAL MUSIC GENERATION TOOLKIT
        </motion.p>

        {/* Data sources */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.7 }}
          className="mb-12 text-xs uppercase tracking-[0.22em] font-medium"
          style={{ color: 'rgba(255,255,255,0.38)' }}
        >
          Powered by Last.fm · Free Music Archive · Million Song Dataset · MusicCaps
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-12 max-w-lg"
        >
          {['Vibe Graph', 'Blueprint RAG', 'Free Text', 'Lyrics to Music', 'Sound Match'].map(label => (
            <Pill key={label} label={label} />
          ))}
        </motion.div>

        {/* CTA button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.05, duration: 0.5 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/app')}
          className="relative px-12 py-5 rounded-2xl font-bold text-lg overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: '#fff',
            letterSpacing: '-0.01em',
          }}
        >
          {/* Button sheen */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 55%)',
            }}
          />
          <span className="relative flex items-center gap-2.5">
            <Zap size={18} fill="white" color="white" strokeWidth={0} />
            Start Creating
          </span>
        </motion.button>

        {/* Mini waveform under button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.35, duration: 0.8 }}
          className="flex items-end gap-[3px] mt-8"
          style={{ height: '44px' }}
        >
          {waveBars.map(b => <WaveBar key={b.id} height={b.height} delay={b.delay} />)}
        </motion.div>

        {/* Powered by footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-10 flex items-center gap-2"
        >
          {/* ElevenLabs bars icon */}
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.38)' }} aria-label="ElevenLabs">
            <rect x="11" y="4" width="3.5" height="24" rx="1.75" fill="currentColor" />
            <rect x="17.5" y="4" width="3.5" height="24" rx="1.75" fill="currentColor" />
          </svg>
          <p className="text-[10px] uppercase tracking-[0.26em] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Powered by{' '}
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>ElevenLabs</span>
            {' '}·{' '}
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Turbopuffer</span>
          </p>
        </motion.div>

      </div>
    </div>
  );
}
