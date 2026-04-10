import { vibePresets } from '@/data/graphNodes';
import { Zap } from 'lucide-react';

interface EmptyStateProps {
  onSelectPreset: (nodeIds: string[]) => void;
}

export default function EmptyState({ onSelectPreset }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center space-y-6 pointer-events-auto max-w-md px-4">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Click nodes on the graph to build your vibe, or try one of these:</p>
        </div>
        <div className="flex flex-col gap-2">
          {vibePresets.map((preset, i) => (
            <button
              key={i}
              onClick={() => onSelectPreset(preset.nodes)}
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-secondary/80 border border-border/50
                text-sm text-foreground/80 hover:text-foreground hover:bg-secondary hover:border-primary/30
                transition-all duration-300 group"
            >
              <Zap size={14} className="text-accent group-hover:text-accent transition-colors" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
