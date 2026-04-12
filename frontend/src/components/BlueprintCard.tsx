import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Blueprint } from '@/lib/api';

interface BlueprintCardProps {
  blueprint: Blueprint;
  rank: number;
  selected?: boolean;
  onToggle?: () => void;
  /** Override sizing — defaults to 'w-52 flex-shrink-0' for horizontal lists */
  className?: string;
}

function Bar({ value, color = 'linear-gradient(90deg, #6366f1, #f97316)' }: { value: number; color?: string }) {
  return (
    <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(value, 1) * 100}%`, background: color }} />
    </div>
  );
}

export default function BlueprintCard({ blueprint: bp, rank, selected, onToggle, className = 'flex-shrink-0 w-52' }: BlueprintCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isSelectable = onToggle !== undefined;

  return (
    <div
      onClick={isSelectable ? onToggle : undefined}
      className={`${className} rounded-2xl border flex flex-col transition-all ${
        isSelectable ? 'cursor-pointer hover:brightness-110' : ''
      }`}
      style={{
        background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)',
        border: selected ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: selected
          ? 'inset 0 1px 0 rgba(165,168,255,0.12), 0 0 16px rgba(99,102,241,0.15)'
          : 'inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
    >
      {/* Main card body */}
      <div className="p-4 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.22em] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(99,102,241,0.15)', color: 'rgba(165,168,255,0.85)' }}
          >
            #{rank}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {bp.source || 'unknown'}
            </span>
            {/* Expand toggle — stops propagation so it doesn't toggle selection */}
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
              className="flex items-center justify-center w-5 h-5 rounded-md transition-colors"
              style={{
                background: expanded ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                border: expanded ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: expanded ? 'rgba(165,168,255,0.9)' : 'rgba(255,255,255,0.35)',
              }}
            >
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {isSelectable && (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: selected ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.08)',
                  border: selected ? '1px solid rgba(99,102,241,0.9)' : '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {selected && <Check size={9} color="white" strokeWidth={3} />}
              </div>
            )}
          </div>
        </div>

        {/* Genre + mood */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {bp.genre && bp.genre !== 'unknown' && (
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(251,191,36,0.12)', color: 'rgba(251,191,36,0.85)' }}
            >
              {bp.genre}
            </span>
          )}
          {bp.mood && (
            <span
              className="text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.1)', color: 'rgba(165,168,255,0.75)' }}
            >
              {bp.mood.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex flex-col">
            <span className="text-[16px] font-bold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.9)' }}>
              {Math.round(bp.bpm)}
            </span>
            <span className="text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.35)' }}>BPM</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.85)' }}>
              {bp.key}{bp.mode === 'minor' ? 'm' : ''}
            </span>
            <span className="text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Key</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold leading-none" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.85)' }}>
              {Math.round(bp.energy * 100)}
            </span>
            <span className="text-[8px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Energy</span>
          </div>
        </div>

        {/* Energy bar */}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${bp.energy * 100}%`, background: 'linear-gradient(90deg, #6366f1, #f97316)' }}
          />
        </div>

        {/* Caption */}
        {bp.caption_summary && (
          <p className="text-[10px] leading-4 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {bp.caption_summary}
          </p>
        )}
      </div>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="px-4 pb-4 flex flex-col gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Audio features grid */}
              <div className="pt-3">
                <p className="text-[8px] uppercase tracking-[0.22em] mb-2" style={{ color: 'rgba(255,255,255,0.28)' }}>Audio Features</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Acousticness</span>
                      <span className="text-[8px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.55)' }}>{bp.acousticness.toFixed(2)}</span>
                    </div>
                    <Bar value={bp.acousticness} color="linear-gradient(90deg,#6366f1,#a78bfa)" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Valence</span>
                      <span className="text-[8px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.55)' }}>{bp.valence.toFixed(2)}</span>
                    </div>
                    <Bar value={bp.valence} color="linear-gradient(90deg,#f97316,#fbbf24)" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Danceability</span>
                      <span className="text-[8px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.55)' }}>{bp.danceability.toFixed(2)}</span>
                    </div>
                    <Bar value={bp.danceability} color="linear-gradient(90deg,#10b981,#34d399)" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Instrumental</span>
                      <span className="text-[8px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.55)' }}>{bp.instrumentalness.toFixed(2)}</span>
                    </div>
                    <Bar value={bp.instrumentalness} color="linear-gradient(90deg,#64748b,#94a3b8)" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Liveness</span>
                      <span className="text-[8px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.55)' }}>{bp.liveness.toFixed(2)}</span>
                    </div>
                    <Bar value={bp.liveness} color="linear-gradient(90deg,#ec4899,#f472b6)" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>Speechiness</span>
                      <span className="text-[8px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.55)' }}>{bp.speechiness.toFixed(2)}</span>
                    </div>
                    <Bar value={bp.speechiness} color="linear-gradient(90deg,#06b6d4,#67e8f9)" />
                  </div>
                </div>
              </div>

              {/* Extra metadata */}
              <div className="flex flex-col gap-1.5">
                {bp.loudness !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.32)' }}>Loudness</span>
                    <span className="text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.6)' }}>{bp.loudness.toFixed(1)} dB</span>
                  </div>
                )}
                {bp.vocal_type && (
                  <div className="flex justify-between">
                    <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.32)' }}>Vocals</span>
                    <span className="text-[9px] capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>{bp.vocal_type}</span>
                  </div>
                )}
                {bp.mood && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[8px] uppercase tracking-[0.14em] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.32)' }}>Mood</span>
                    <span className="text-[9px] text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>{bp.mood}</span>
                  </div>
                )}
                {bp.themes && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[8px] uppercase tracking-[0.14em] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.32)' }}>Themes</span>
                    <span className="text-[9px] text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>{bp.themes}</span>
                  </div>
                )}
                {bp.genres_all && bp.genres_all !== bp.genre && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[8px] uppercase tracking-[0.14em] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.32)' }}>All Genres</span>
                    <span className="text-[9px] text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>{bp.genres_all}</span>
                  </div>
                )}
                {bp.tags && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[8px] uppercase tracking-[0.14em] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.32)' }}>Tags</span>
                    <span className="text-[9px] text-right line-clamp-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{bp.tags}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[8px] uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.32)' }}>Match Score</span>
                  <span className="text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(165,168,255,0.75)' }}>{bp.similarity_score.toFixed(4)}</span>
                </div>
              </div>

              {/* Full caption */}
              {bp.caption_summary && (
                <div className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[9px] uppercase tracking-[0.16em] mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>Caption</p>
                  <p className="text-[10px] leading-4" style={{ color: 'rgba(255,255,255,0.55)' }}>{bp.caption_summary}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
