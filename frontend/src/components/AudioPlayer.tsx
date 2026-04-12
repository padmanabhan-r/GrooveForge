import { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  vibeSummary: string;
  blueprintCount: number;
  trackKey: string;
  trackBpm: number;
  audioUrl?: string;
}

export default function AudioPlayer({ vibeSummary, blueprintCount, trackKey, trackBpm, audioUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate waveform bars once
  const bars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => {
      const x = i / 80;
      const base = Math.sin(x * Math.PI) * 0.6;
      const detail = Math.sin(x * 12) * 0.15 + Math.sin(x * 25) * 0.1 + Math.sin(x * 47) * 0.08;
      return Math.max(0.08, Math.min(1, base + detail + 0.3 + (Math.random() * 0.1)));
    });
  }, []);

  // Reset when a new track arrives
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [audioUrl]);

  // Sync real audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    // Simulated playback fallback (no audioUrl)
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsPlaying(false);
            return 0;
          }
          return p + 0.5;
        });
      }, 100);
    }
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(pct);
    if (audioUrl && audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (pct / 100) * audioRef.current.duration;
    }
  };

  return (
    <div className="glass-panel p-6 space-y-4 animate-slide-up">
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
      )}

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
                backgroundColor: isPast ? '#6366f1' : 'rgba(255,255,255,0.08)',
                boxShadow: isPast ? '0 0 4px rgba(99,102,241,0.4)' : 'none',
                opacity: isPast ? 1 : 0.7,
              }}
            />
          );
        })}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-accent shadow-lg shadow-accent/50 transition-all duration-100"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Controls + Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              if (audioRef.current) audioRef.current.currentTime = 0;
              setProgress(0);
            }}
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
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
        onClick={handleScrub}
      >
        <div
          className="h-full rounded-full transition-all duration-100 relative"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
            boxShadow: '0 0 8px rgba(99,102,241,0.5)',
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
