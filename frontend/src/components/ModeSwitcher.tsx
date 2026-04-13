import { Network, MessageSquare, FileText, AudioWaveform } from 'lucide-react';

export type AppMode = 'graph' | 'text' | 'lyrics' | 'sound';

const modes: { id: AppMode; label: string; icon: typeof Network }[] = [
  { id: 'graph',  label: 'Vibe Graph',   icon: Network        },
  { id: 'sound',  label: 'Sound Match',  icon: AudioWaveform  },
  { id: 'text',   label: 'Text to Music', icon: MessageSquare },
  { id: 'lyrics', label: 'Lyrics to Music', icon: FileText    },
];

interface ModeSwitcherProps {
  active: AppMode;
  onChange: (mode: AppMode) => void;
}

export default function ModeSwitcher({ active, onChange }: ModeSwitcherProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-full px-1.5 py-1.5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.24)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {modes.map(m => {
        const isActive = active === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className="group relative flex min-w-[64px] items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300"
            style={isActive ? {
              color: '#fff',
              transform: 'translateY(-1px)',
            } : {
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {/* Active tab: frosted glass pill with glossy sheen */}
            {isActive && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.1)',
                }}
              />
            )}
            {/* Inactive tab: subtle glass on hover */}
            {!isActive && (
              <div
                className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            )}
            {/* Glossy top highlight line */}
            {isActive && (
              <div
                className="absolute top-1 left-3 right-3 h-px rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                }}
              />
            )}
            <m.icon size={15} className="relative z-10" strokeWidth={isActive ? 2.5 : 2} />
            <span className="relative z-10 hidden sm:inline tracking-[0.01em]">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}