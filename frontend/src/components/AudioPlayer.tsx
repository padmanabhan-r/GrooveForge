import { useState, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  vibeSummary: string;
  blueprintCount: number;
  trackKey: string;
  trackBpm: number;
}

export default function AudioPlayer({ vibeSummary, blueprintCount, trackKey, trackBpm }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  // Generate mock waveform bars
  const bars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => {
      const x = i / 80;
      // Create a natural-looking waveform shape
      const base = Math.sin(x * Math.PI) * 0.6;
      const detail = Math.sin(x * 12) * 0.15 + Math.sin(x * 25) * 0.1 + Math.sin(x * 47) * 0.08;
      return Math.max(0.08, Math.min(1, base + detail + 0.3 + (Math.random() * 0.1)));
    });
  }, []);

  // Simulate playback
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return p + 0.5;
        });
      }, 100);
    }
  };

  return (
    <div className="glass-panel p-6 space-y-4 animate-slide-up">
      {/* Waveform */}
      <div className="relative h-24 flex items-end gap-[2px] overflow-hidden rounded-lg waveform-draw">
        {bars.map((h, i) => {
          const barProgress = (i / bars.length) * 100;
          const isPast = barProgress < progress;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-colors duration-150"
              style={{
                height: `${h * 100}%`,
                backgroundColor: isPast
                  ? 'hsl(255 85% 60%)'
                  : 'hsl(220 15% 22%)',
                opacity: isPast ? 1 : 0.6,
              }}
            />
          );
        })}
        {/* Progress line */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-accent shadow-lg shadow-accent/50 transition-all duration-100"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Controls + Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 transition-all shadow-lg shadow-primary/30"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward size={18} />
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors ml-2">
            <Volume2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <p className="text-foreground/80 font-medium">{vibeSummary}</p>
            <p className="text-muted-foreground">{blueprintCount} blueprints used</p>
          </div>
          <div className="flex gap-2">
            <span className="text-metric px-2 py-1 rounded bg-node-key/15 text-node-key">{trackKey}</span>
            <span className="text-metric px-2 py-1 rounded bg-node-tempo/15 text-node-tempo">{trackBpm} BPM</span>
          </div>
        </div>
      </div>

      {/* Scrubber */}
      <div
        className="h-1 rounded-full bg-secondary cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setProgress(((e.clientX - rect.left) / rect.width) * 100);
        }}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-100 relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
