import { Gauge, Music, Layers, Heart } from 'lucide-react';

interface ProfileProps {
  avgBpm: number;
  dominantKey: string;
  genreCluster: string;
  moodCluster: string;
  horizontal?: boolean;
}

export default function AggregatedProfile({ avgBpm, dominantKey, genreCluster, moodCluster, horizontal }: ProfileProps) {
  const items = [
    { icon: Gauge, label: 'BPM', value: String(avgBpm), color: 'text-node-tempo', bg: 'bg-node-tempo/10' },
    { icon: Music, label: 'Key', value: dominantKey, color: 'text-node-key', bg: 'bg-node-key/10' },
    { icon: Layers, label: 'Genre', value: genreCluster, color: 'text-node-genre', bg: 'bg-node-genre/10' },
    { icon: Heart, label: 'Mood', value: moodCluster, color: 'text-node-mood', bg: 'bg-node-mood/10' },
  ];

  if (horizontal) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        {items.map(item => (
          <div key={item.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${item.bg}`}>
            <item.icon size={12} className={item.color} />
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">{item.label}</p>
              <p className={`text-metric text-xs ${item.color} leading-tight`}>{item.value || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 animate-fade-in">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pre-flight Readout</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
            <item.icon size={14} className={`mt-0.5 ${item.color}`} />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className={`text-metric text-sm ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
