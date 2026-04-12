import { useRef } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { useState, useEffect } from 'react';
import { GenerateResponse, resolveAudioUrl } from '@/lib/api';
import BlueprintCard from './BlueprintCard';

interface GenerationResultProps {
  result: GenerateResponse;
}

function MiniPlayer({ audioUrl, promptUsed }: { audioUrl: string; promptUsed: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  const src = resolveAudioUrl(audioUrl);

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, [audioUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) { el.pause(); } else { el.play().catch(() => {}); }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const t = parseFloat(e.target.value);
    el.currentTime = t;
    setProgress(t);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="rounded-2xl border border-white/10 p-5 flex flex-col gap-3"
      style={{ background: 'rgba(255,255,255,0.04)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          const el = audioRef.current;
          if (el) { setProgress(el.currentTime); setDuration(el.duration || 0); }
        }}
        onLoadedMetadata={() => {
          const el = audioRef.current;
          if (el) setDuration(el.duration || 0);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
            boxShadow: '0 0 16px rgba(249,115,22,0.35)',
          }}
        >
          {isPlaying
            ? <Pause size={15} fill="white" color="white" strokeWidth={0} />
            : <Play size={15} fill="white" color="white" strokeWidth={0} className="ml-0.5" />
          }
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={progress}
            onChange={handleScrub}
            className="w-full h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#f97316' }}
          />
          <div className="flex justify-between">
            <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.38)' }}>
              {fmt(progress)}
            </span>
            <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.38)' }}>
              {duration ? fmt(duration) : '--:--'}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowPrompt(p => !p)}
        className="flex items-center gap-1.5 self-start transition-opacity hover:opacity-80"
        style={{ color: showPrompt ? 'rgba(165,168,255,0.85)' : 'rgba(255,255,255,0.32)' }}
      >
        <Music size={10} />
        <span className="text-[9px] uppercase tracking-[0.2em]">
          {showPrompt ? 'Hide' : 'Show'} generation prompt
        </span>
      </button>

      {showPrompt && (
        <p
          className="text-[11px] leading-5 rounded-xl px-3 py-2 border border-white/8"
          style={{ background: 'rgba(99,102,241,0.06)', color: 'rgba(255,255,255,0.58)' }}
        >
          {promptUsed}
        </p>
      )}
    </div>
  );
}

export default function GenerationResult({ result }: GenerationResultProps) {
  const { audio_url, prompt_used, blueprints, aggregated } = result;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55 mb-1">Generated Track</p>
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Your Blueprint</h2>
      </div>

      {/* Aggregated traits */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Avg BPM', value: Math.round(aggregated.avg_bpm).toString() },
          { label: 'Key', value: aggregated.mode_key },
          { label: 'Style', value: prompt_used.split(',')[0].trim() || aggregated.genre_cluster },
          { label: 'Vocal', value: aggregated.vocal_type || '—' },
          { label: 'Energy', value: (aggregated.energy * 100).toFixed(0) + '%' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col px-3 py-2 rounded-xl border border-white/8"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="text-[8px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
            <span
              className="text-sm font-semibold mt-0.5"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.9)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Audio player */}
      <MiniPlayer audioUrl={audio_url} promptUsed={prompt_used} />

      {/* Blueprint reasoning trail */}
      {blueprints.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] mb-2" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Retrieved Blueprints · {blueprints.length}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {blueprints.map((bp, i) => (
              <BlueprintCard key={bp.id} blueprint={bp} rank={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
