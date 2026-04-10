import { Gauge, Music, Layers, Heart } from 'lucide-react';

interface ProfileProps {
  avgBpm: number;
  dominantKey: string;
  genreCluster: string;
  moodCluster: string;
}

export default function AggregatedProfile({ avgBpm, dominantKey, genreCluster, moodCluster }: ProfileProps) {
  const items = [
    { icon: Gauge, label: 'Avg BPM', value: String(avgBpm), color: 'text-node-tempo' },
    { icon: Music, label: 'Key', value: dominantKey, color: 'text-node-key' },
    { icon: Layers, label: 'Genre', value: genreCluster, color: 'text-node-genre' },
    { icon: Heart, label: 'Mood', value: moodCluster, color: 'text-node-mood' },
  ];

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
