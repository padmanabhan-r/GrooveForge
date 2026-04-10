import { AppMode } from './ModeSwitcher';
import { Search, Music, Shuffle, Mic, Sparkles } from 'lucide-react';

interface InputPanelsProps {
  mode: AppMode;
  onGenerate: () => void;
}

export default function InputPanels({ mode, onGenerate }: InputPanelsProps) {
  if (mode === 'graph') return null;

  return (
    <div className="glass-panel p-6 animate-fade-in" key={mode}>
      {mode === 'text' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Describe your vibe</label>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="A nostalgic summer drive at sunset with synths and soft drums..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          <button onClick={onGenerate} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2">
            <Sparkles size={16} /> Generate from Description
          </button>
        </div>
      )}

      {mode === 'lyrics' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Paste your lyrics</label>
          <textarea
            placeholder="Write or paste your original lyrics here...&#10;&#10;The app will analyze mood, rhythm, and theme to generate a matching track."
            rows={8}
            className="w-full px-4 py-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
          />
          <button onClick={onGenerate} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2">
            <Music size={16} /> Generate from Lyrics
          </button>
        </div>
      )}

      {mode === 'remix' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Remix a previous result</label>
          <p className="text-sm text-muted-foreground">Generate a track first, then use remix controls to tweak it.</p>
          <button disabled className="w-full py-3 rounded-lg bg-secondary text-muted-foreground font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2">
            <Shuffle size={16} /> No track to remix yet
          </button>
        </div>
      )}

      {mode === 'artist' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Reference an artist's style</label>
          <div className="relative">
            <Mic size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g. 'The Weeknd meets Tame Impala'"
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          <button onClick={onGenerate} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2">
            <Sparkles size={16} /> Generate from Reference
          </button>
        </div>
      )}
    </div>
  );
}
