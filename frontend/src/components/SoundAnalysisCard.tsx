import { SoundAnalysis } from '@/lib/api';

interface SoundAnalysisCardProps {
  analysis: SoundAnalysis;
}

export default function SoundAnalysisCard({ analysis }: SoundAnalysisCardProps) {
  const energyPct = Math.round(analysis.energy * 100);
  const keyDisplay =
    analysis.key === 'unknown' ? 'unknown key' : `${analysis.key} ${analysis.mode}`.trim();

  return (
    <div
      className="rounded-2xl border border-white/10 p-4 flex flex-col gap-3"
      style={{ background: 'rgba(99,102,241,0.06)', boxShadow: 'inset 0 1px 0 rgba(165,168,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: 'rgba(165,168,255,0.65)' }}>
          Sound Analysis
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Energy
          </span>
          <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${energyPct}%`,
                background: 'linear-gradient(90deg, #6366f1 0%, #f97316 100%)',
              }}
            />
          </div>
          <span
            className="text-[9px]"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.45)' }}
          >
            {energyPct}%
          </span>
        </div>
      </div>

      {/* BPM + Key row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Tempo
          </p>
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(253,186,116,0.95)' }}
          >
            {Math.round(analysis.bpm_estimate)} BPM
          </span>
        </div>
        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Key
          </p>
          <span
            className="text-sm font-semibold"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(165,168,255,0.9)' }}
          >
            {keyDisplay}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Mood
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.mood.map(m => (
              <span
                key={m}
                className="px-1.5 py-0.5 rounded text-[9px]"
                style={{ background: 'rgba(99,102,241,0.2)', color: 'rgba(165,168,255,0.9)' }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Texture
          </p>
          <div className="flex flex-wrap gap-1">
            {analysis.texture_tags.map(t => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-[9px]"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="text-[8px] uppercase tracking-[0.18em] mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
          Suggested Genres
        </p>
        <div className="flex flex-wrap gap-1">
          {analysis.suggested_genres.map(g => (
            <span
              key={g}
              className="px-1.5 py-0.5 rounded text-[9px]"
              style={{ background: 'rgba(249,115,22,0.15)', color: 'rgba(249,180,100,0.9)' }}
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
