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
    <div
      className="flex items-center gap-1.5 rounded-[20px] p-1.5"
      style={{
        background: 'linear-gradient(180deg, rgba(18,21,31,0.88) 0%, rgba(10,12,20,0.72) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 32px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
      }}
    >
      {modes.map(m => {
        const isActive = active === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="group relative flex min-w-[56px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300"
            style={isActive ? {
              background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%), linear-gradient(145deg, #fb923c 0%, #f97316 58%, #d85d07 100%)',
              color: '#fff',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 10px 24px rgba(249,115,22,0.28), 0 2px 8px rgba(0,0,0,0.32)',
              transform: 'translateY(-1px)',
            } : {
              color: 'rgba(255,255,255,0.56)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)',
            }}
          >
            <div
              className="absolute inset-[1px] rounded-[15px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}
            />
            <m.icon size={15} className="relative z-10" />
            <span className="relative z-10 hidden sm:inline tracking-[0.01em]">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
