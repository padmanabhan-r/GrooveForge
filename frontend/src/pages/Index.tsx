import { useState, useCallback } from 'react';
import ModeSwitcher, { AppMode } from '@/components/ModeSwitcher';
import VibeGraph from '@/components/VibeGraph';
import VibePanel from '@/components/VibePanel';
import InputPanels from '@/components/InputPanels';
import BlueprintTrail from '@/components/BlueprintTrail';
import AudioPlayer from '@/components/AudioPlayer';
import AggregatedProfile from '@/components/AggregatedProfile';
import RemixControls from '@/components/RemixControls';
import EmptyState from '@/components/EmptyState';
import GeneratingOverlay from '@/components/GeneratingOverlay';
import AnimatedBackground from '@/components/AnimatedBackground';
import { mockBlueprints, mockAggregatedProfile } from '@/data/mockBlueprints';
import { graphNodes } from '@/data/graphNodes';

type AppState = 'empty' | 'selecting' | 'generating' | 'results';

const Index = () => {
  const [mode, setMode] = useState<AppMode>('graph');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [appState, setAppState] = useState<AppState>('empty');

  const toggleNode = useCallback((id: string) => {
    setSelectedNodes(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(n => n !== id);
        if (next.length === 0) setAppState('empty');
        return next;
      }
      if (prev.length >= 4) return prev;
      setAppState('selecting');
      return [...prev, id];
    });
  }, []);

  const selectPreset = useCallback((nodeIds: string[]) => {
    setSelectedNodes(nodeIds);
    setAppState('selecting');
  }, []);

  const handleGenerate = useCallback(() => {
    setAppState('generating');
    setTimeout(() => setAppState('results'), 2500);
  }, []);

  const vibeSummary = selectedNodes
    .map(id => graphNodes.find(n => n.id === id)?.label)
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <AnimatedBackground isPlaying={appState === 'results'} />
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground tracking-tight">GrooveForge</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Search by vibe · Generate by blueprint</p>
          </div>
        </div>
        <ModeSwitcher active={mode} onChange={setMode} />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Canvas Area */}
        <div className="flex-1 relative p-4">
          {mode === 'graph' && (
            <>
              <VibeGraph
                selectedNodes={selectedNodes}
                onToggleNode={toggleNode}
              />
              {appState === 'empty' && selectedNodes.length === 0 && (
                <EmptyState onSelectPreset={selectPreset} />
              )}
            </>
          )}
          {mode !== 'graph' && (
            <div className="max-w-2xl mx-auto mt-12">
              <InputPanels mode={mode} onGenerate={handleGenerate} />
            </div>
          )}

          {/* Generating overlay */}
          {appState === 'generating' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-20">
              <GeneratingOverlay />
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        {mode === 'graph' && (
          <div className="w-80 border-l border-border/50 p-4 flex flex-col gap-4 overflow-y-auto">
            <VibePanel
              selectedNodes={selectedNodes}
              onRemoveNode={toggleNode}
              onGenerate={handleGenerate}
              isGenerating={appState === 'generating'}
            />

            {appState === 'selecting' && selectedNodes.length >= 2 && (
              <AggregatedProfile {...mockAggregatedProfile} />
            )}

            {appState === 'results' && (
              <RemixControls onRegenerate={handleGenerate} />
            )}
          </div>
        )}
      </div>

      {/* Bottom Section - Results */}
      {appState === 'results' && (
        <div className="border-t border-border/50 p-4 space-y-4 relative z-10">
          <AudioPlayer
            vibeSummary={vibeSummary || 'Custom Vibe'}
            blueprintCount={mockBlueprints.length}
            trackKey={mockAggregatedProfile.dominantKey}
            trackBpm={mockAggregatedProfile.avgBpm}
          />
          <BlueprintTrail blueprints={mockBlueprints} />
        </div>
      )}
    </div>
  );
};

export default Index;
