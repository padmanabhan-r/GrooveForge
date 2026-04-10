import { GitBranch, Type, Music, Shuffle, Mic } from 'lucide-react';

export type AppMode = 'graph' | 'text' | 'lyrics' | 'remix' | 'artist';

const modes: { id: AppMode; label: string; icon: typeof GitBranch }[] = [
  { id: 'graph', label: 'Graph', icon: GitBranch },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'lyrics', label: 'Lyrics', icon: Music },
  { id: 'remix', label: 'Remix', icon: Shuffle },
  { id: 'artist', label: 'Artist', icon: Mic },
];

interface ModeSwitcherProps {
  active: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeSwitcher({ active, onChange }: ModeSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 backdrop-blur-sm">
      {modes.map(m => {
        const isActive = active === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
              ${isActive
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
          >
            <m.icon size={16} />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
