import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Sparkles, Plus, X, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ModeSwitcher, { AppMode } from '@/components/ModeSwitcher';
import VibeGraph from '@/components/VibeGraph';
import InputPanels from '@/components/InputPanels';
import AnimatedBackground from '@/components/AnimatedBackground';
import GenerationResult from '@/components/GenerationResult';
import BlueprintCard from '@/components/BlueprintCard';
import { BlueprintDeck } from '@/components/BlueprintDeck';
import ReviewModal from '@/components/ReviewModal';
import { generateTrack, previewGeneration, searchBlueprints, analyzeLyrics, analyzeSound, GenerateResponse, SearchResponse, Blueprint, PreviewResponse, LyricsAnalysis, SoundAnalysis } from '@/lib/api';
import LyricsAnalysisCard from '@/components/LyricsAnalysisCard';
import SoundAnalysisCard from '@/components/SoundAnalysisCard';
import GeneratingOverlay from '@/components/GeneratingOverlay';
import HistoryPanel from '@/components/HistoryPanel';
import { useHistory } from '@/hooks/useHistory';
import { compileQuery, getNodeLabel } from '@/data/graphNodes';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const MODE_META: Record<AppMode, { label: string; description: string }> = {
  graph: {
    label: 'Vibe Graph',
    description: 'Click a root bubble to expand its traits. Keep drilling down into nested bubbles to refine your sound, then discover matching blueprints from the panel on the right.',
  },
  text: {
    label: 'Text to Music',
    description: 'Describe anything — artist names, song titles, genres, moods, eras. We\'ll search the blueprint index for the closest matches and generate from there.',
  },
  lyrics: {
    label: 'Lyrics to Music',
    description: 'Paste your original lyrics and we\'ll analyze tone, rhythm, and theme to find matching blueprints.',
  },
  sound: {
    label: 'Sound Match',
    description: 'Record or upload a reference clip. We\'ll identify its vibe, key, tempo, and texture — then find blueprints that match its feel.',
  },
  history: {
    label: 'Generated History',
    description: 'All your generated tracks, saved locally. Replay, rename, or download any of them.',
  },
};

const Index = () => {
  const { entries: historyEntries, addEntry, renameEntry, removeEntry } = useHistory();
  const [mode, setMode] = useState<AppMode>('graph');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [extraVibes, setExtraVibes] = useState<string[]>([]);
  const [vibeInput, setVibeInput] = useState('');
  const vibeInputRef = useRef<HTMLInputElement>(null);
  const [freeText, setFreeText] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Step 1: search
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [lyricsAnalysis, setLyricsAnalysis] = useState<LyricsAnalysis | null>(null);
  const [soundAnalysis, setSoundAnalysis] = useState<SoundAnalysis | null>(null);
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState<Set<string>>(new Set());

  // Step 2: generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<'simple' | 'advanced'>('simple');
  const [musicLengthMs, setMusicLengthMs] = useState(90000);
  const [graphResetKey, setGraphResetKey] = useState(0);

  // Review mode — preview prompt/plan before sending to ElevenLabs
  const [reviewMode, setReviewMode] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  // Pending generate request — stored so confirm can fire it
  const pendingGenerate = useRef<Parameters<typeof generateTrack>[0] | null>(null);

  // Pop-out deck dialog
  const [deckPoppedOut, setDeckPoppedOut] = useState(false);

  const toggleNode = useCallback((id: string) => {
    setSelectedNodes(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  }, []);

  const toggleBlueprint = useCallback((id: string) => {
    setSelectedBlueprintIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setError(null);
    setSearchResults(null);
    setLyricsAnalysis(null);
    setSoundAnalysis(null);
    setGenerationResult(null);

    try {
      if (mode === 'lyrics') {
        const result = await analyzeLyrics(lyrics);
        setLyricsAnalysis(result.analysis);
        setSearchResults({ blueprints: result.blueprints, aggregated: result.aggregated });
        setSelectedBlueprintIds(new Set(result.blueprints.map(bp => bp.id)));
        setGenerationMode('advanced');
      } else if (mode === 'sound') {
        if (!audioFile) throw new Error('No audio file selected');
        const result = await analyzeSound(audioFile);
        setSoundAnalysis(result.analysis);
        setSearchResults({ blueprints: result.blueprints, aggregated: result.aggregated });
        setSelectedBlueprintIds(new Set(result.blueprints.map(bp => bp.id)));
      } else {
        const baseQuery = mode === 'graph' ? compileQuery(selectedNodes) : null;
        const query = mode === 'graph'
          ? {
              ...baseQuery!,
              free_text: [baseQuery!.free_text, ...extraVibes].filter(Boolean).join(' '),
            }
          : {
              vibes: [],
              free_text: freeText,
              bpm_lower: null,
              bpm_upper: null,
              key: null,
              vocal_type: null,
              top_k: 8,
            };
        const result = await searchBlueprints(query);
        setSearchResults(result);
        setSelectedBlueprintIds(new Set(result.blueprints.map(bp => bp.id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [mode, selectedNodes, freeText, lyrics, extraVibes, audioFile]);

  const _buildGeneratePayload = useCallback(() => {
    if (!searchResults) return null;
    const blueprints: Blueprint[] = searchResults.blueprints.filter(bp => selectedBlueprintIds.has(bp.id));
    if (blueprints.length === 0) return null;
    const user_input = mode === 'graph'
      ? selectedNodes.map(getNodeLabel).join(', ')
      : mode === 'lyrics'
      ? (lyricsAnalysis?.search_query ?? lyrics)
      : mode === 'sound'
      ? (soundAnalysis?.search_query ?? '')
      : freeText;
    return {
      vibes: [] as string[],
      free_text: '',
      blueprints,
      bpm_lower: null,
      bpm_upper: null,
      lyrics: mode === 'lyrics' ? lyrics : '',
      user_input,
      generation_mode: generationMode,
      music_length_ms: musicLengthMs,
    };
  }, [searchResults, selectedBlueprintIds, mode, lyrics, freeText, selectedNodes, generationMode, musicLengthMs, lyricsAnalysis, soundAnalysis]);

  const handleGenerate = useCallback(async () => {
    const payload = _buildGeneratePayload();
    if (!payload) return;

    if (reviewMode) {
      // Preview step: synthesize without calling ElevenLabs
      setIsPreviewing(true);
      setError(null);
      try {
        const preview = await previewGeneration(payload);
        pendingGenerate.current = payload;
        setPreviewData(preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Preview failed. Please try again.');
      } finally {
        setIsPreviewing(false);
      }
      return;
    }

    // Direct generation (review mode off)
    setDeckPoppedOut(false);
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateTrack(payload);
      setGenerationResult(result);
      addEntry(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [_buildGeneratePayload, reviewMode, addEntry]);

  const handleConfirmGenerate = useCallback(async () => {
    const payload = pendingGenerate.current;
    if (!payload) return;
    setDeckPoppedOut(false);
    setPreviewData(null);
    pendingGenerate.current = null;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateTrack(payload);
      setGenerationResult(result);
      addEntry(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [setDeckPoppedOut, addEntry]);

  const handleReset = useCallback(() => {
    setSearchResults(null);
    setLyricsAnalysis(null);
    setSoundAnalysis(null);
    setAudioFile(null);
    setGenerationResult(null);
    setSelectedBlueprintIds(new Set());
    setError(null);
    setExtraVibes([]);
    setVibeInput('');
    setSelectedNodes([]);
    setPreviewData(null);
    pendingGenerate.current = null;
    setGraphResetKey(k => k + 1);
  }, []);

  const meta = MODE_META[mode];
  const canSearch = mode === 'graph'
    ? selectedNodes.length >= 1
    : mode === 'text'
    ? freeText.trim().length > 0
    : mode === 'lyrics'
    ? lyrics.trim().length > 0
    : mode === 'sound'
    ? audioFile !== null
    : false;

  const selectedBlueprints = searchResults?.blueprints.filter(bp => selectedBlueprintIds.has(bp.id)) ?? [];

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      <AnimatedBackground isPlaying={false} />

      {/* Full-screen loading overlay */}
      <AnimatePresence>
        {(isSearching || isGenerating) && (
          <GeneratingOverlay phase={isSearching ? 'searching' : 'generating'} />
        )}
      </AnimatePresence>

      {/* Main content grid */}
      <div className="absolute inset-x-4 top-20 bottom-4 z-0 sm:inset-x-6 sm:top-24 sm:bottom-6 lg:inset-x-8 lg:top-28 lg:bottom-8">
        <div className={`grid h-full grid-cols-1 gap-4 ${mode !== 'history' ? 'xl:grid-cols-[minmax(0,1fr)_352px]' : ''}`}>

          {/* Left: main panel */}
          <div className="relative min-h-[420px]">
            {/* Keep VibeGraph mounted at all times to prevent spring re-animation on tab switch */}
            <div style={{ display: mode === 'graph' ? 'block' : 'none' }} className="absolute inset-0">
              <VibeGraph selectedNodes={selectedNodes} onToggleNode={toggleNode} onClearSelections={() => { setSelectedNodes([]); setGraphResetKey(k => k + 1); }} resetKey={graphResetKey} />
            </div>
            {mode === 'history' && (
              <div className="absolute inset-0 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.88),rgba(8,12,24,0.74))] p-6 overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <HistoryPanel entries={historyEntries} onRename={renameEntry} onRemove={removeEntry} />
              </div>
            )}
            {mode !== 'graph' && mode !== 'history' && (
              <InputPanels
                mode={mode}
                freeText={freeText}
                onFreeTextChange={setFreeText}
                lyrics={lyrics}
                onLyricsChange={setLyrics}
                audioFile={audioFile}
                onAudioFileChange={setAudioFile}
                onSearch={handleSearch}
                isSearching={isSearching}
              />
            )}
          </div>

          {/* Right: selection deck / blueprint results / generation result */}
          {mode !== 'history' && <aside className="glass-panel flex h-full min-h-[420px] flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.88),rgba(8,12,24,0.74))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.32)] overflow-y-auto">

            {/* State 3: generation result */}
            {generationResult && (
              <>
                <GenerationResult result={generationResult} />
                <button
                  onClick={handleReset}
                  className="mt-4 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-80"
                  style={{ color: 'rgba(255,255,255,0.32)' }}
                >
                  ← New generation
                </button>
              </>
            )}

            {/* State 2: blueprint selection */}
            {!generationResult && searchResults && (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55">Retrieved Blueprints</p>
                    <h2 className="mt-2 text-base font-semibold tracking-[-0.02em] text-white">Pick Your Sound</h2>
                    <p className="mt-1 text-sm leading-5 text-white/62">
                      These blueprints matched your vibe. Toggle any to include or exclude them, then generate your track.
                    </p>
                  </div>
                  <button
                    onClick={() => setDeckPoppedOut(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 transition-all hover:brightness-110 mt-6"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      color: 'rgba(165,168,255,0.8)',
                    }}
                    title="Pop out to separate window"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>

                {error && (
                  <div
                    className="mt-4 rounded-xl border border-red-500/25 px-4 py-3 text-sm"
                    style={{ background: 'rgba(239,68,68,0.07)', color: 'rgba(255,180,180,0.9)' }}
                  >
                    {error}
                  </div>
                )}

                {lyricsAnalysis && (
                  <div className="mt-4">
                    <LyricsAnalysisCard analysis={lyricsAnalysis} />
                  </div>
                )}

                {soundAnalysis && (
                  <div className="mt-4">
                    <SoundAnalysisCard analysis={soundAnalysis} />
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-1.5 flex-1">
                  {searchResults.blueprints.map((bp, i) => (
                    <BlueprintCard
                      key={bp.id}
                      blueprint={bp}
                      rank={i + 1}
                      selected={selectedBlueprintIds.has(bp.id)}
                      onToggle={() => toggleBlueprint(bp.id)}
                      className="w-full"
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {/* Generation mode toggle */}
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.22em] text-white/38 mb-1.5">Generation Mode</p>
                    <div className="flex gap-1.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {(['simple', 'advanced'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setGenerationMode(m)}
                          className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold capitalize transition-all"
                          style={generationMode === m ? {
                            background: 'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(249,115,22,0.18))',
                            border: '1px solid rgba(249,115,22,0.35)',
                            color: 'rgba(253,186,116,0.95)',
                          } : {
                            border: '1px solid transparent',
                            color: 'rgba(255,255,255,0.38)',
                          }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={generationMode}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        className="mt-2 text-[10px] leading-4"
                        style={{ color: 'rgba(255,255,255,0.38)' }}
                      >
                        {generationMode === 'simple'
                          ? 'A single vivid prompt is synthesized from your blueprints and sent to ElevenLabs. Fast and great for most vibes.'
                          : 'A structured plan with intro, verse, chorus, and outro sections — better for longer tracks and when adding lyrics.'}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  {/* Length selector */}
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.22em] text-white/38 mb-1.5">Length</p>
                    <div className="flex gap-1.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {([
                        { label: '30s', ms: 30000 },
                        { label: '60s', ms: 60000 },
                        { label: '90s', ms: 90000 },
                        { label: '2m',  ms: 120000 },
                      ] as const).map(({ label, ms }) => (
                        <button
                          key={ms}
                          onClick={() => setMusicLengthMs(ms)}
                          className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-all"
                          style={musicLengthMs === ms ? {
                            background: 'linear-gradient(135deg,rgba(251,191,36,0.18),rgba(249,115,22,0.18))',
                            border: '1px solid rgba(249,115,22,0.35)',
                            color: 'rgba(253,186,116,0.95)',
                          } : {
                            border: '1px solid transparent',
                            color: 'rgba(255,255,255,0.38)',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-1.5">
                  {/* Review mode toggle */}
                  <button
                    onClick={() => setReviewMode(v => !v)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all"
                    style={{
                      background: reviewMode ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                      border: reviewMode ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="text-left">
                      <p className="text-[10px] font-semibold" style={{ color: reviewMode ? 'rgba(165,168,255,0.9)' : 'rgba(255,255,255,0.55)' }}>
                        Review before generating
                      </p>
                      <p className="text-[9px] mt-0.5" style={{ color: reviewMode ? 'rgba(165,168,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
                        Preview the {generationMode === 'advanced' ? 'composition plan' : 'prompt'} before it goes to ElevenLabs
                      </p>
                    </div>
                    {/* Toggle pill */}
                    <div
                      className="relative flex-shrink-0 w-8 h-4 rounded-full transition-all"
                      style={{ background: reviewMode ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)' }}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                        style={{ left: reviewMode ? '17px' : '2px' }}
                      />
                    </div>
                  </button>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || isPreviewing || selectedBlueprints.length === 0}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    <Sparkles size={15} />
                    {isPreviewing ? 'Synthesizing…' : isGenerating ? 'Generating…' : reviewMode ? `Review & Generate · ${selectedBlueprints.length} blueprint${selectedBlueprints.length !== 1 ? 's' : ''}` : `Generate Music · ${selectedBlueprints.length} blueprint${selectedBlueprints.length !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    onClick={handleReset}
                    className="text-[10px] uppercase tracking-[0.2em] text-center transition-opacity hover:opacity-80"
                    style={{ color: 'rgba(255,255,255,0.32)' }}
                  >
                    ← Search again
                  </button>
                </div>
              </>
            )}

            {/* State 1: initial selection deck */}
            {!generationResult && !searchResults && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55">Selection Deck</p>
                  <h2 className="mt-3 text-base font-semibold tracking-[-0.02em] text-white">Blueprint Inputs</h2>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {mode === 'graph'
                      ? 'Every selected bubble is added here. Find blueprints when ready.'
                      : 'Enter your query in the left panel, then find matching blueprints.'}
                  </p>
                </div>

                {error && (
                  <div
                    className="mt-4 rounded-xl border border-red-500/25 px-4 py-3 text-sm"
                    style={{ background: 'rgba(239,68,68,0.07)', color: 'rgba(255,180,180,0.9)' }}
                  >
                    {error}
                  </div>
                )}

                {mode === 'graph' && (
                  <div className="mt-6 flex flex-col flex-1 gap-3">
                    {/* Unified vibes container: node chips + extra tags + input */}
                    <div
                      className="rounded-2xl p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] uppercase tracking-[0.22em] text-white/38">Selected Vibes</span>
                        <span className="text-[10px] font-mono text-white/30">{selectedNodes.length + extraVibes.length}</span>
                      </div>

                      {/* All chips: graph nodes + extra tags */}
                      {(selectedNodes.length > 0 || extraVibes.length > 0) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedNodes.map(id => {
                            const label = getNodeLabel(id);
                            return (
                              <button
                                key={id}
                                onClick={() => toggleNode(id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                                style={{
                                  background: 'rgba(99,102,241,0.15)',
                                  border: '1px solid rgba(99,102,241,0.3)',
                                  color: 'rgba(165,180,252,0.9)',
                                }}
                              >
                                {label}
                                <X size={10} className="opacity-60" />
                              </button>
                            );
                          })}
                          {extraVibes.map((v, i) => (
                            <button
                              key={`extra-${i}`}
                              onClick={() => setExtraVibes(prev => prev.filter((_, j) => j !== i))}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                              style={{
                                background: 'rgba(251,191,36,0.12)',
                                border: '1px solid rgba(251,191,36,0.28)',
                                color: 'rgba(253,186,116,0.9)',
                              }}
                            >
                              {v}
                              <X size={10} className="opacity-60" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/28 leading-5">Pick nodes from the graph to define genre, mood, texture, and energy.</p>
                      )}

                      {/* Add more tags input — always visible inside the same box */}
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex gap-2">
                          <input
                            ref={vibeInputRef}
                            type="text"
                            value={vibeInput}
                            onChange={e => setVibeInput(e.target.value)}
                            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                              if ((e.key === 'Enter' || e.key === ',') && vibeInput.trim()) {
                                e.preventDefault();
                                const tag = vibeInput.trim().replace(/,$/, '');
                                if (tag && !extraVibes.includes(tag)) {
                                  setExtraVibes(prev => [...prev, tag]);
                                }
                                setVibeInput('');
                              }
                            }}
                            placeholder="Add more tags: cinematic, dark…"
                            className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.09)',
                            }}
                          />
                          <button
                            onClick={() => {
                              const tag = vibeInput.trim().replace(/,$/, '');
                              if (tag && !extraVibes.includes(tag)) {
                                setExtraVibes(prev => [...prev, tag]);
                              }
                              setVibeInput('');
                              vibeInputRef.current?.focus();
                            }}
                            disabled={!vibeInput.trim()}
                            className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 transition-all disabled:opacity-30"
                            style={{
                              background: 'rgba(251,191,36,0.14)',
                              border: '1px solid rgba(251,191,36,0.25)',
                              color: 'rgba(253,186,116,0.85)',
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="mt-1.5 text-[9px] text-white/25">Enter or , to add · click chip to remove</p>
                      </div>
                    </div>

                    {/* Find Blueprints button — below the unified vibes block */}
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || (selectedNodes.length === 0 && extraVibes.length === 0)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      <Sparkles size={15} />
                      {isSearching ? 'Searching…' : 'Find Blueprints'}
                    </button>
                  </div>
                )}

                {mode !== 'graph' && (
                  <div className="mt-6 flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <Sparkles size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                      <p className="text-sm text-white/40 leading-6">
                        {!canSearch
                          ? 'Enter your query on the left to begin.'
                          : 'Click Find Blueprints to search.'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>}
        </div>
      </div>

      {/* Floating title */}
      <Link to="/" className="absolute top-4 left-5 z-20 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}>
          <Zap size={16} fill="white" color="white" strokeWidth={0} />
        </div>
        <div
          className="px-4 py-2.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <p
            className="text-[18px] font-bold leading-none tracking-wide"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            GrooveForge
          </p>
        </div>
      </Link>

      {/* Floating mode tabs */}
      <div className="absolute top-4 right-4 z-20">
        <ModeSwitcher active={mode} onChange={(m) => { setMode(m); handleReset(); }} />
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

      {/* Feature description */}
      <div className="pointer-events-none absolute left-5 top-[72px] z-10 hidden max-w-sm rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:block">
        <p className="text-[10px] uppercase tracking-[0.24em] text-sky-200/55">{meta.label}</p>
        <p className="mt-1 text-sm leading-5 text-white/72">{meta.description}</p>
      </div>

      {/* Review modal */}
      {previewData && (
        <ReviewModal
          preview={previewData}
          isGenerating={isGenerating}
          onConfirm={handleConfirmGenerate}
          onCancel={() => { setPreviewData(null); pendingGenerate.current = null; }}
        />
      )}

      {/* Pop-out deck dialog */}
      <Dialog open={deckPoppedOut} onOpenChange={setDeckPoppedOut}>
        <DialogContent
          className="max-w-2xl w-[calc(100vw-3rem)] max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col p-0"
          style={{
            background: 'linear-gradient(180deg,rgba(10,16,32,0.95),rgba(8,12,24,0.92))',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Pop-out header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55">Retrieved Blueprints</p>
              <h2 className="text-lg font-semibold text-white">Pick Your Sound</h2>
              <p className="mt-1 text-sm text-white/55">Remove blueprints that don't fit your vision — only the ones you keep will shape the track.</p>
            </div>
          </div>

          {/* Blueprint deck content — scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
            {searchResults && (
              <BlueprintDeck
                searchResults={searchResults}
                selectedBlueprintIds={selectedBlueprintIds}
                onToggleBlueprint={toggleBlueprint}
                generationMode={generationMode}
                onGenerationModeChange={setGenerationMode}
                musicLengthMs={musicLengthMs}
                onMusicLengthChange={setMusicLengthMs}
                reviewMode={reviewMode}
                onReviewModeChange={setReviewMode}
                onGenerate={handleGenerate}
                onReset={() => { setDeckPoppedOut(false); handleReset(); }}
                isGenerating={isGenerating}
                isPreviewing={isPreviewing}
                error={error}
                lyricsAnalysis={lyricsAnalysis}
                soundAnalysis={soundAnalysis}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
