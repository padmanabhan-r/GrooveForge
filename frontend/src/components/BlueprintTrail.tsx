import { Blueprint } from '@/data/mockBlueprints';

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
        {blueprints.map((bp, i) => (
          <div
            key={bp.id}
            className="glass-panel p-4 min-w-[260px] max-w-[280px] flex-shrink-0 space-y-3 stagger-in"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            {/* Genre */}
            <div>
              <p className="text-sm font-semibold text-foreground">{bp.genre}</p>
              <p className="text-xs text-muted-foreground">{bp.subgenre}</p>
            </div>

            {/* Metrics row */}
            <div className="flex items-center gap-2">
              <span className="text-metric px-2 py-0.5 rounded bg-node-tempo/15 text-node-tempo text-xs">
                {bp.bpm} BPM
              </span>
              <span className="text-metric px-2 py-0.5 rounded bg-node-key/15 text-node-key text-xs">
                {bp.key} {bp.mode}
              </span>
            </div>

            {/* Energy bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Energy</span>
                <span className="text-metric text-foreground/70">{bp.energy}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                  style={{ width: `${bp.energy}%` }}
                />
              </div>
            </div>

            {/* Mood */}
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-node-mood/15 text-node-mood border border-node-mood/20">
              {bp.mood}
            </span>

            {/* Instrumentation */}
            <div className="flex flex-wrap gap-1">
              {bp.instrumentation.map(inst => (
                <span key={inst} className="px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                  {inst}
                </span>
              ))}
            </div>

            {/* Relevance */}
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary/60" style={{ width: `${bp.relevance}%` }} />
              </div>
              <span className="text-metric text-xs text-muted-foreground">{bp.relevance}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
