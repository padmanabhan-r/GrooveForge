import { useState } from 'react';
import { RefreshCw, Mic, MicOff } from 'lucide-react';

export default function RemixControls({ onRegenerate }: { onRegenerate: () => void }) {
  const [moodShift, setMoodShift] = useState(50);
  const [tempoNudge, setTempoNudge] = useState(50);
  const [hasVocals, setHasVocals] = useState(false);

  return (
    <div className="glass-panel p-5 space-y-5 animate-fade-in">
      <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Remix</h3>

      {/* Mood slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Darker</span>
          <span>Brighter</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={moodShift}
          onChange={e => setMoodShift(Number(e.target.value))}
          className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/30"
        />
      </div>

      {/* Tempo nudge */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>−20 BPM</span>
          <span>+20 BPM</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={tempoNudge}
          onChange={e => setTempoNudge(Number(e.target.value))}
          className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-accent/30"
        />
      </div>

      {/* Vocal toggle */}
      <button
        onClick={() => setHasVocals(!hasVocals)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium w-full transition-all
          ${hasVocals
            ? 'bg-primary/15 text-primary border border-primary/30'
            : 'bg-secondary text-muted-foreground border border-border'
          }`}
      >
        {hasVocals ? <Mic size={16} /> : <MicOff size={16} />}
        {hasVocals ? 'Vocals' : 'Instrumental'}
      </button>

      <button
        onClick={onRegenerate}
        className="w-full py-3 rounded-lg bg-accent text-accent-foreground font-semibold text-sm
          hover:brightness-110 transition-all flex items-center justify-center gap-2 glow-ring-accent"
      >
        <RefreshCw size={16} />
        Regenerate
      </button>
    </div>
  );
}
