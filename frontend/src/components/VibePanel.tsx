import { graphNodes } from '@/data/graphNodes';
import { X, Sparkles } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  genre: 'bg-node-genre/20 text-node-genre border-node-genre/30',
  mood: 'bg-node-mood/20 text-node-mood border-node-mood/30',
  tempo: 'bg-node-tempo/20 text-node-tempo border-node-tempo/30',
  key: 'bg-node-key/20 text-node-key border-node-key/30',
  instrument: 'bg-node-instrument/20 text-node-instrument border-node-instrument/30',
  theme: 'bg-node-theme/20 text-node-theme border-node-theme/30',
};

interface VibePanelProps {
  selectedNodes: string[];
  onRemoveNode: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function VibePanel({ selectedNodes, onRemoveNode, onGenerate, isGenerating }: VibePanelProps) {
  const selected = graphNodes.filter(n => selectedNodes.includes(n.id));

  if (selected.length === 0) return null;

  return (
    <div className="glass-panel p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Your Vibe</h3>
        <span className="text-metric text-muted-foreground">{selected.length}/4</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {selected.map(node => (
          <button
            key={node.id}
            onClick={() => onRemoveNode(node.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 ${CATEGORY_COLORS[node.category]}`}
          >
            {node.label}
            <X size={12} className="opacity-60" />
          </button>
        ))}
      </div>
      <button
        onClick={onGenerate}
        disabled={isGenerating || selected.length < 2}
        className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm
          hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed
          flex items-center justify-center gap-2 glow-ring"
      >
        <Sparkles size={16} />
        {isGenerating ? 'Generating...' : 'Generate Track'}
      </button>
    </div>
  );
}
