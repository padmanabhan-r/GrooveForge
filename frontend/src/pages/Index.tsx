import { useState, useCallback } from 'react';
import ModeSwitcher, { AppMode } from '@/components/ModeSwitcher';
import VibeGraph from '@/components/VibeGraph';
import InputPanels from '@/components/InputPanels';
import AnimatedBackground from '@/components/AnimatedBackground';

const Index = () => {
  const [mode, setMode] = useState<AppMode>('graph');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  const toggleNode = useCallback((id: string) => {
    setSelectedNodes(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      <AnimatedBackground isPlaying={false} />

      {/* Graph canvas — full viewport */}
      {mode === 'graph' && (
        <div className="absolute inset-x-4 top-20 bottom-4 z-0 sm:inset-x-6 sm:top-24 sm:bottom-6 lg:inset-x-8 lg:top-28 lg:bottom-8">
          <VibeGraph selectedNodes={selectedNodes} onToggleNode={toggleNode} />
        </div>
      )}

      {/* Other input modes */}
      {mode !== 'graph' && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="max-w-2xl w-full px-4">
            <InputPanels mode={mode} onGenerate={() => {}} />
          </div>
        </div>
      )}

      {/* Floating title — top left */}
      <div className="absolute top-4 left-5 z-20 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #fb923c 0%, #f97316 50%, #ea6c0a 100%)',
            boxShadow: '0 0 14px rgba(249,115,22,0.45), 0 2px 6px rgba(0,0,0,0.4)',
          }}>
          <span style={{ fontSize: 15 }}>🔥</span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-white leading-tight" style={{ letterSpacing: '-0.01em' }}>
            GrooveForge
          </p>
          <p className="text-[8px] uppercase tracking-[0.18em] font-medium"
            style={{ color: 'rgba(249,115,22,0.55)' }}>
            Search by vibe · Generate by blueprint
          </p>
        </div>
      </div>

      {/* Floating mode tabs — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ModeSwitcher active={mode} onChange={setMode} />
      </div>

      {mode === 'graph' && (
        <div className="pointer-events-none absolute left-5 top-[72px] z-10 hidden max-w-sm rounded-2xl border border-white/8 bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:block">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">Vibe Graph</p>
          <p className="mt-1 text-sm leading-5 text-white/72">
            Expand a category, then refine with sub-bubbles. Labels stay inside the nodes so the clusters read cleanly.
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;
