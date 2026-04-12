import React from 'react';
import { getNodeLabel, getRootForNode } from '@/data/graphNodes';
import { X, Sparkles } from 'lucide-react';

// Map root ID → Tailwind color classes
const ROOT_COLORS: Record<string, string> = {
  genre:   'bg-node-genre/20 text-node-genre border-node-genre/30',
  mood:    'bg-node-mood/20 text-node-mood border-node-mood/30',
  tempo:   'bg-node-tempo/20 text-node-tempo border-node-tempo/30',
  key:     'bg-node-key/20 text-node-key border-node-key/30',
  vocals:  'bg-node-instrument/20 text-node-instrument border-node-instrument/30',
  energy:  'bg-node-theme/20 text-node-theme border-node-theme/30',
  texture: 'bg-node-genre/20 text-node-genre border-node-genre/30',
};

const DEFAULT_COLOR = 'bg-secondary text-secondary-foreground border-border';

interface VibePanelProps {
  selectedNodes: string[];
  onRemoveNode: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  horizontal?: boolean;
  hideButton?: boolean;
  title?: string;
  buttonLabel?: string;
  emptyMessage?: string;
  minSelections?: number;
  className?: string;
  children?: React.ReactNode;
}

export default function VibePanel({
  selectedNodes,
  onRemoveNode,
  onGenerate,
  isGenerating,
  horizontal,
  hideButton = false,
  title = 'Your Vibe',
  buttonLabel = 'Generate Track',
  emptyMessage = 'Select nodes on the graph to build your blueprint.',
  minSelections = 2,
  className = '',
  children,
}: VibePanelProps) {
  const isDisabled = isGenerating || selectedNodes.length < minSelections;

  if (horizontal) {
    if (selectedNodes.length === 0) return null;
    return (
      <div className="flex items-center gap-3 flex-wrap animate-fade-in">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Vibe</span>
        <div className="flex flex-wrap gap-1.5">
          {selectedNodes.map(id => {
            const root = getRootForNode(id);
            const colorClass = root ? (ROOT_COLORS[root.id] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
            return (
              <button
                key={id}
                onClick={() => onRemoveNode(id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all hover:scale-105 ${colorClass}`}
              >
                {getNodeLabel(id)}
                <X size={10} className="opacity-60" />
              </button>
            );
          })}
        </div>
        <button
          onClick={onGenerate}
          disabled={isDisabled}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm
            hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center gap-2 glow-ring whitespace-nowrap"
        >
          <Sparkles size={14} />
          {isGenerating ? 'Generating…' : buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className={`glass-panel p-4 animate-fade-in ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">{title}</h3>
        <span className="text-metric text-muted-foreground">{selectedNodes.length}</span>
      </div>
      {selectedNodes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedNodes.map(id => {
            const root = getRootForNode(id);
            const colorClass = root ? (ROOT_COLORS[root.id] ?? DEFAULT_COLOR) : DEFAULT_COLOR;
            return (
              <button
                key={id}
                onClick={() => onRemoveNode(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 ${colorClass}`}
              >
                {getNodeLabel(id)}
                <X size={12} className="opacity-60" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-white/58">
          {emptyMessage}
        </div>
      )}
      {children}
      {!hideButton && (
        <button
          onClick={onGenerate}
          disabled={isDisabled}
          className="mt-4 w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm
            hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center justify-center gap-2 glow-ring"
        >
          <Sparkles size={16} />
          {isGenerating ? 'Generating...' : buttonLabel}
        </button>
      )}
    </div>
  );
}
