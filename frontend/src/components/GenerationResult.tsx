import { useRef } from 'react';
import { Play, Pause, Music, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CompositionPlan, GenerateResponse, resolveAudioUrl } from '@/lib/api';
import BlueprintCard from './BlueprintCard';

interface GenerationResultProps {
  result: GenerateResponse;
}

function CompositionPlanView({ plan }: { plan: CompositionPlan }) {
  return (
    <div className="flex flex-col gap-2 text-[11px] leading-5" style={{ color: 'rgba(255,255,255,0.58)' }}>
      {plan.positive_global_styles.length > 0 && (
        <div>
          <span className="uppercase tracking-[0.18em] text-[9px]" style={{ color: 'rgba(165,168,255,0.65)' }}>
            Global styles
          </span>
          <p className="mt-0.5">{plan.positive_global_styles.join(', ')}</p>
        </div>
      )}
      {plan.negative_global_styles.length > 0 && (
        <div>
          <span className="uppercase tracking-[0.18em] text-[9px]" style={{ color: 'rgba(255,120,120,0.55)' }}>
            Avoid
          </span>
          <p className="mt-0.5">{plan.negative_global_styles.join(', ')}</p>
        </div>
      )}
      {plan.sections.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="uppercase tracking-[0.18em] text-[9px]" style={{ color: 'rgba(165,168,255,0.65)' }}>
            Sections
          </span>
          {plan.sections.map((s, i) => (
            <div key={i} className="rounded-lg px-2.5 py-1.5 border border-white/6" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold capitalize" style={{ color: 'rgba(255,255,255,0.78)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {s.section_name}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.32)', fontSize: '9px' }}>
                  {(s.duration_ms / 1000).toFixed(0)}s
                </span>
              </div>
              {s.positive_local_styles.length > 0 && (
                <p>{s.positive_local_styles.join(', ')}</p>
              )}
              {s.lines.length > 0 && (
                <p className="mt-0.5 italic" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  "{s.lines.slice(0, 2).join(' / ')}{s.lines.length > 2 ? '…' : ''}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniPlayer({ audioUrl, promptUsed, compositionPlan }: { audioUrl: string; promptUsed: string; compositionPlan: CompositionPlan | null }) {
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
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
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

      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPrompt(p => !p)}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ color: showPrompt ? 'rgba(165,168,255,0.85)' : 'rgba(255,255,255,0.32)' }}
        >
          <Music size={10} />
          <span className="text-[9px] uppercase tracking-[0.2em]">
            {showPrompt ? 'Hide' : 'Show'} generation prompt
          </span>
        </button>

        <a
          href={src}
          download
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{ color: 'rgba(255,255,255,0.32)' }}
          title="Download MP3"
        >
          <Download size={10} />
          <span className="text-[9px] uppercase tracking-[0.2em]">Save</span>
        </a>
      </div>

      {showPrompt && (
        <div
          className="rounded-xl px-3 py-2.5 border border-white/8"
          style={{ background: 'rgba(99,102,241,0.06)' }}
        >
          {compositionPlan
            ? <CompositionPlanView plan={compositionPlan} />
            : <p className="text-[11px] leading-5" style={{ color: 'rgba(255,255,255,0.58)' }}>{promptUsed}</p>
          }
        </div>
      )}
    </div>
  );
}

export default function GenerationResult({ result }: GenerationResultProps) {
  const { audio_url, prompt_used, composition_plan, blueprints, aggregated } = result;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55 mb-1">Generated Track</p>
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Your Generated Track</h2>
      </div>

      {/* Aggregated traits */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Avg BPM', value: Math.round(aggregated.avg_bpm).toString() },
          { label: 'Key', value: aggregated.mode_key },
          { label: 'Style', value: prompt_used.split(',')[0].trim() || aggregated.genre_cluster },
          {
            label: 'Vocal',
            value: (() => {
              if (aggregated.vocal_type) return aggregated.vocal_type;
              const vocalTerm = prompt_used.split(',').map(s => s.trim()).find(s =>
                /vocal|voice|singer|rap|choir|growl|spoken|instrumental/i.test(s)
              );
              return vocalTerm || '—';
            })(),
          },
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
      <MiniPlayer audioUrl={audio_url} promptUsed={prompt_used} compositionPlan={composition_plan} />

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
