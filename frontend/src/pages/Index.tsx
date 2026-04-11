import { useState, useCallback } from 'react';
import ModeSwitcher, { AppMode } from '@/components/ModeSwitcher';
import VibeGraph from '@/components/VibeGraph';
import VibePanel from '@/components/VibePanel';
import InputPanels from '@/components/InputPanels';
import BlueprintTrail from '@/components/BlueprintTrail';
import AudioPlayer from '@/components/AudioPlayer';
import AggregatedProfile from '@/components/AggregatedProfile';
import RemixControls from '@/components/RemixControls';
import GeneratingOverlay from '@/components/GeneratingOverlay';
import AnimatedBackground from '@/components/AnimatedBackground';
import { getNodeLabel, compileQuery } from '@/data/graphNodes';
import {
  Blueprint, AggregatedTraits, GenerateResponse,
  generateTrack, resolveAudioUrl,
} from '@/lib/api';

type AppState = 'empty' | 'selecting' | 'generating' | 'results' | 'error';

const EMPTY_AGGREGATED: AggregatedTraits = {
  avg_bpm: 0, mode_key: '', genre_cluster: '', mood_cluster: '', energy: 0, vocal_type: '',
};

const Index = () => {
  const [mode, setMode] = useState<AppMode>('graph');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [appState, setAppState] = useState<AppState>('empty');
  const [errorMsg, setErrorMsg] = useState('');

  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedTraits>(EMPTY_AGGREGATED);
  const [audioUrl, setAudioUrl] = useState('');
  const [promptUsed, setPromptUsed] = useState('');

  const toggleNode = useCallback((id: string) => {
    setSelectedNodes(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(n => n !== id);
        if (next.length === 0) setAppState('empty');
        return next;
      }
      setAppState('selecting');
      return [...prev, id];
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (selectedNodes.length === 0) return;
    setAppState('generating');
    setErrorMsg('');

    const query = compileQuery(selectedNodes);
    try {
      const result: GenerateResponse = await generateTrack({
        vibes: query.vibes,
        blueprints: [],        // let backend do retrieval
        bpm_lower: query.bpm_lower,
        bpm_upper: query.bpm_upper,
        lyrics: '',
        mode: 'prompt',
      });
      setBlueprints(result.blueprints);
      setAggregated(result.aggregated);
      setAudioUrl(resolveAudioUrl(result.audio_url));
      setPromptUsed(result.prompt_used);
      setAppState('results');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Generation failed');
      setAppState('error');
    }
  }, [selectedNodes]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const vibeSummary = selectedNodes
    .map(id => getNodeLabel(id))
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
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">The ultimate musician's toolkit</p>
          </div>
        </div>
        <ModeSwitcher active={mode} onChange={setMode} />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Canvas Area */}
        <div className="flex-1 relative p-4">
          {mode === 'graph' && (
            <VibeGraph selectedNodes={selectedNodes} onToggleNode={toggleNode} />
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

          {/* Error state */}
          {appState === 'error' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg z-20">
              {errorMsg}
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

            {(appState === 'selecting' || appState === 'error') && selectedNodes.length >= 2 && (
              <AggregatedProfile
                avgBpm={aggregated.avg_bpm || 0}
                dominantKey={aggregated.mode_key || '—'}
                genreCluster={aggregated.genre_cluster || '—'}
                moodCluster={aggregated.mood_cluster || '—'}
              />
            )}

            {appState === 'results' && (
              <>
                <AggregatedProfile
                  avgBpm={aggregated.avg_bpm}
                  dominantKey={aggregated.mode_key}
                  genreCluster={aggregated.genre_cluster}
                  moodCluster={aggregated.mood_cluster}
                />
                <RemixControls onRegenerate={handleRegenerate} />
                {promptUsed && (
                  <div className="glass-panel p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prompt Used</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{promptUsed}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section - Results */}
      {appState === 'results' && (
        <div className="border-t border-border/50 p-4 space-y-4 relative z-10">
          <AudioPlayer
            vibeSummary={vibeSummary || 'Custom Vibe'}
            blueprintCount={blueprints.length}
            trackKey={aggregated.mode_key}
            trackBpm={aggregated.avg_bpm}
            audioUrl={audioUrl}
          />
          <BlueprintTrail blueprints={blueprints} />
        </div>
      )}
    </div>
  );
};

export default Index;
