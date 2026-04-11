import { Blueprint } from '@/lib/api';

interface BlueprintTrailProps {
  blueprints: Blueprint[];
}

export default function BlueprintTrail({ blueprints }: BlueprintTrailProps) {
  if (blueprints.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider px-1">
        Blueprint Trail — {blueprints.length} references
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {blueprints.map((bp, i) => {
          const energyPct = Math.round(bp.energy * 100);
          const genreLabel = bp.genre !== 'unknown' ? bp.genre : bp.genres_all.split(',')[0]?.trim() ?? '—';
          const keyLabel = bp.key && bp.mode ? `${bp.key} ${bp.mode}` : bp.key || '—';
          const tags = bp.themes
            ? bp.themes.split(' ').slice(0, 3)
            : bp.tags.split(' ').slice(0, 3);

          return (
            <div
              key={bp.id}
              className="glass-panel p-4 min-w-[260px] max-w-[280px] flex-shrink-0 space-y-3 stagger-in"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {/* Title / genre */}
              <div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {bp.title || genreLabel}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {bp.artist ? `${bp.artist} · ` : ''}{genreLabel}
                </p>
              </div>

              {/* Metrics row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-metric px-2 py-0.5 rounded bg-node-tempo/15 text-node-tempo text-xs">
                  {Math.round(bp.bpm)} BPM
                </span>
                {bp.key && (
                  <span className="text-metric px-2 py-0.5 rounded bg-node-key/15 text-node-key text-xs">
                    {keyLabel}
                  </span>
                )}
              </div>

              {/* Energy bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="text-metric text-foreground/70">{energyPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                    style={{ width: `${energyPct}%` }}
                  />
                </div>
              </div>

              {/* Mood */}
              {bp.mood && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-node-mood/15 text-node-mood border border-node-mood/20">
                  {bp.mood.split(' ')[0]}
                </span>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.filter(Boolean).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Similarity */}
              {bp.similarity_score > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.round(bp.similarity_score * 100)}%` }} />
                  </div>
                  <span className="text-metric text-xs text-muted-foreground">
                    {Math.round(bp.similarity_score * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
