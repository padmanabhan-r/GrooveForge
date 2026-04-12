import { useState, useCallback } from 'react';
import { Zap } from 'lucide-react';
import ModeSwitcher, { AppMode } from '@/components/ModeSwitcher';
import VibeGraph from '@/components/VibeGraph';
import InputPanels from '@/components/InputPanels';
import AnimatedBackground from '@/components/AnimatedBackground';
import VibePanel from '@/components/VibePanel';

const MODE_META: Record<AppMode, { label: string; description: string }> = {
  graph: {
    label: 'Vibe Graph',
    description: 'Click a root node to expand its traits. Drill into sub-nodes to refine your sound, then build your blueprint from the panel on the right.',
  },
  text: {
    label: 'Free Text',
    description: 'Describe your sound in plain language. We\'ll embed your query and retrieve matching musical blueprints to generate your track.',
  },
  lyrics: {
    label: 'Lyrics to Music',
    description: 'Paste your original lyrics and we\'ll analyze tone, rhythm, and theme to find matching blueprints and generate a track tailored to your words.',
  },
  sound: {
    label: 'Sound Match',
    description: 'Upload or record a reference clip. We\'ll identify its vibe, key, tempo, and texture — then find blueprints that match its feel.',
  },
};

const Index = () => {
  const [mode, setMode] = useState<AppMode>('graph');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

  const toggleNode = useCallback((id: string) => {
    setSelectedNodes(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  }, []);

  const handleGenerateBlueprint = useCallback(() => {}, []);

  const meta = MODE_META[mode];

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      <AnimatedBackground isPlaying={false} />

      {/* Main content grid — same layout for all modes */}
      <div className="absolute inset-x-4 top-20 bottom-4 z-0 sm:inset-x-6 sm:top-24 sm:bottom-6 lg:inset-x-8 lg:top-28 lg:bottom-8">
        <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* Left: main panel */}
          <div className="relative min-h-[420px]">
            {mode === 'graph'
              ? <VibeGraph selectedNodes={selectedNodes} onToggleNode={toggleNode} onClearSelections={() => setSelectedNodes([])} />
              : <InputPanels mode={mode} onGenerate={handleGenerateBlueprint} />
            }
          </div>

          {/* Right: selection deck — always visible */}
          <aside className="glass-panel flex h-full min-h-[420px] flex-col justify-between rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.88),rgba(8,12,24,0.74))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.32)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55">Selection Deck</p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">Blueprint Inputs</h2>
              <p className="mt-2 text-sm leading-6 text-white/62">
                Every selected node is added here. Remove anything you do not want in the generated blueprint.
              </p>
            </div>
            <VibePanel
              selectedNodes={selectedNodes}
              onRemoveNode={toggleNode}
              onGenerate={handleGenerateBlueprint}
              isGenerating={false}
              title="Selected Vibes"
              buttonLabel="Generate a Blueprint"
              emptyMessage="Pick nodes from the graph to define genre, mood, texture, and energy before generating a blueprint."
              minSelections={1}
              className="mt-6 flex-1 border-white/0 bg-transparent p-0 shadow-none"
            />
          </aside>
        </div>
      </div>

      {/* Floating title — top left */}
      <div className="absolute top-4 left-5 z-20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
            boxShadow: '0 0 20px rgba(251,191,36,0.45), 0 0 8px rgba(249,115,22,0.55), 0 3px 8px rgba(0,0,0,0.45)',
          }}>
          <Zap size={18} fill="white" color="white" strokeWidth={0} />
        </div>
        <div>
          <p className="text-[16px] font-black leading-tight"
            style={{
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #ffffff 0%, #fde68a 42%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
            GrooveForge
          </p>
          <p className="text-[8px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: 'rgba(249,115,22,0.6)' }}>
            Search by vibe · Generate by blueprint
          </p>
        </div>
      </div>

      {/* Floating mode tabs — top right */}
      <div className="absolute top-4 right-4 z-20">
        <ModeSwitcher active={mode} onChange={setMode} />
      </div>

      {/* Powered-by footer */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
        <p className="text-[9px] uppercase tracking-[0.26em] font-medium whitespace-nowrap"
          style={{ color: 'rgba(255,255,255,0.22)' }}>
          Powered by{' '}
          <span style={{ color: 'rgba(255,255,255,0.38)' }}>ElevenLabs</span>
          {' '}·{' '}
          <span style={{ color: 'rgba(255,255,255,0.38)' }}>Turbopuffer</span>
        </p>
      </div>

      {/* Feature description — top left, below title, all modes */}
      <div className="pointer-events-none absolute left-5 top-[72px] z-10 hidden max-w-sm rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:block">
        <p className="text-[10px] uppercase tracking-[0.24em] text-sky-200/55">{meta.label}</p>
        <p className="mt-1 text-sm leading-5 text-white/72">{meta.description}</p>
      </div>
    </div>
  );
};

export default Index;
