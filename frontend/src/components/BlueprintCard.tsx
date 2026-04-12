import { Check } from 'lucide-react';
import { Blueprint } from '@/lib/api';

interface BlueprintCardProps {
  blueprint: Blueprint;
  rank: number;
  selected?: boolean;
  onToggle?: () => void;
  /** Override sizing — defaults to 'w-52 flex-shrink-0' for horizontal lists */
  className?: string;
}

export default function BlueprintCard({ blueprint: bp, rank, selected, onToggle, className = 'flex-shrink-0 w-52' }: BlueprintCardProps) {
  const isSelectable = onToggle !== undefined;

  return (
    <div
      onClick={isSelectable ? onToggle : undefined}
      className={`${className} rounded-2xl border p-4 flex flex-col gap-2 transition-all ${
        isSelectable ? 'cursor-pointer hover:brightness-110' : ''
      }`}
      style={{
        background: selected
          ? 'rgba(99,102,241,0.1)'
          : 'rgba(255,255,255,0.04)',
        border: selected
          ? '1px solid rgba(99,102,241,0.45)'
          : '1px solid rgba(255,255,255,0.1)',
        boxShadow: selected
          ? 'inset 0 1px 0 rgba(165,168,255,0.12), 0 0 16px rgba(99,102,241,0.15)'
          : 'inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
    >
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
          style={{
            width: `${bp.energy * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #f97316)',
          }}
        />
      </div>

      {/* Caption */}
      {bp.caption_summary && (
        <p className="text-[10px] leading-4 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {bp.caption_summary}
        </p>
      )}
    </div>
  );
}
