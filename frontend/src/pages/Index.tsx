import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { Zap, Sparkles, Plus, X } from 'lucide-react';
import ModeSwitcher, { AppMode } from '@/components/ModeSwitcher';
import VibeGraph from '@/components/VibeGraph';
import InputPanels from '@/components/InputPanels';
import AnimatedBackground from '@/components/AnimatedBackground';
import VibePanel from '@/components/VibePanel';
import GenerationResult from '@/components/GenerationResult';
import BlueprintCard from '@/components/BlueprintCard';
import { generateTrack, searchBlueprints, GenerateResponse, SearchResponse, Blueprint } from '@/lib/api';
import { compileQuery, getNodeLabel } from '@/data/graphNodes';

const MODE_META: Record<AppMode, { label: string; description: string }> = {
  graph: {
    label: 'Vibe Graph',
    description: 'Click a root node to expand its traits. Drill into sub-nodes to refine your sound, then find matching blueprints from the panel on the right.',
  },
  text: {
    label: 'Free Text',
    description: 'Describe your sound in plain language. We\'ll embed your query and retrieve matching musical blueprints.',
  },
  lyrics: {
    label: 'Lyrics to Music',
    description: 'Paste your original lyrics and we\'ll analyze tone, rhythm, and theme to find matching blueprints.',
  },
  sound: {
    label: 'Sound Match',
    description: 'Upload or record a reference clip. We\'ll identify its vibe, key, tempo, and texture — then find blueprints that match its feel.',
  },
};

const Index = () => {
  const [mode, setMode] = useState<AppMode>('graph');
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [extraVibes, setExtraVibes] = useState<string[]>([]);
  const [vibeInput, setVibeInput] = useState('');
  const vibeInputRef = useRef<HTMLInputElement>(null);
  const [freeText, setFreeText] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Step 1: search
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [selectedBlueprintIds, setSelectedBlueprintIds] = useState<Set<string>>(new Set());

  // Step 2: generate
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<'simple' | 'advanced'>('simple');
  const [musicLengthMs, setMusicLengthMs] = useState(90000);

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
    setGenerationResult(null);

    try {
      const baseQuery = mode === 'graph' ? compileQuery(selectedNodes) : null;
      const query = mode === 'graph'
        ? {
            ...baseQuery!,
            free_text: [baseQuery!.free_text, ...extraVibes].filter(Boolean).join(' '),
          }
        : {
            vibes: [],
            free_text: mode === 'text' ? freeText : lyrics,
            bpm_lower: null,
            bpm_upper: null,
            key: null,
            vocal_type: null,
            top_k: 8,
          };
      const result = await searchBlueprints(query);
      setSearchResults(result);
      setSelectedBlueprintIds(new Set(result.blueprints.map(bp => bp.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [mode, selectedNodes, freeText, lyrics, extraVibes]);

  const handleGenerate = useCallback(async () => {
    if (!searchResults) return;
    const blueprints: Blueprint[] = searchResults.blueprints.filter(bp => selectedBlueprintIds.has(bp.id));
    if (blueprints.length === 0) return;

    setIsGenerating(true);
    setError(null);

    const user_input = mode === 'graph'
      ? selectedNodes.map(getNodeLabel).join(', ')
      : mode === 'text' ? freeText : lyrics;

    try {
      const result = await generateTrack({
        vibes: [],
        free_text: '',
        blueprints,
        bpm_lower: null,
        bpm_upper: null,
        lyrics: mode === 'lyrics' ? lyrics : '',
        user_input,
        generation_mode: generationMode,
        music_length_ms: musicLengthMs,
      });
      setGenerationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [searchResults, selectedBlueprintIds, mode, lyrics, freeText, selectedNodes, generationMode, musicLengthMs]);

  const handleReset = useCallback(() => {
    setSearchResults(null);
    setGenerationResult(null);
    setSelectedBlueprintIds(new Set());
    setError(null);
    setExtraVibes([]);
    setVibeInput('');
  }, []);

  const meta = MODE_META[mode];
  const canSearch = mode === 'graph'
    ? selectedNodes.length >= 1
    : mode === 'text'
    ? freeText.trim().length > 0
    : mode === 'lyrics'
    ? lyrics.trim().length > 0
    : false;

  const selectedBlueprints = searchResults?.blueprints.filter(bp => selectedBlueprintIds.has(bp.id)) ?? [];

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      <AnimatedBackground isPlaying={false} />

      {/* Main content grid */}
      <div className="absolute inset-x-4 top-20 bottom-4 z-0 sm:inset-x-6 sm:top-24 sm:bottom-6 lg:inset-x-8 lg:top-28 lg:bottom-8">
        <div className="grid h-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* Left: main panel */}
          <div className="relative min-h-[420px]">
            {mode === 'graph'
              ? <VibeGraph selectedNodes={selectedNodes} onToggleNode={toggleNode} onClearSelections={() => setSelectedNodes([])} />
              : <InputPanels
                  mode={mode}
                  freeText={freeText}
                  onFreeTextChange={setFreeText}
                  lyrics={lyrics}
                  onLyricsChange={setLyrics}
                  onSearch={handleSearch}
                  isSearching={isSearching}
                />
            }
          </div>

          {/* Right: selection deck / blueprint results / generation result */}
          <aside className="glass-panel flex h-full min-h-[420px] flex-col rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.88),rgba(8,12,24,0.74))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_rgba(0,0,0,0.32)] overflow-y-auto">

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
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55">Retrieved Blueprints</p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">Pick Your Sound</h2>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    These blueprints matched your vibe. Toggle any to include or exclude them, then generate your track.
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

                <div className="mt-4 flex flex-col gap-2 flex-1">
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

                <div className="mt-4 flex flex-col gap-3">
                  {/* Generation mode toggle */}
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.22em] text-white/38 mb-1.5">Mode</p>
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

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedBlueprints.length === 0}
                    className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
                      boxShadow: '0 0 24px rgba(249,115,22,0.35)',
                    }}
                  >
                    <Sparkles size={15} />
                    {isGenerating ? 'Generating…' : `Generate Music · ${selectedBlueprints.length} blueprint${selectedBlueprints.length !== 1 ? 's' : ''}`}
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
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">Blueprint Inputs</h2>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    {mode === 'graph'
                      ? 'Every selected node is added here. Find blueprints when ready.'
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
                  <div className="mt-6 flex flex-col flex-1 gap-4">
                    <VibePanel
                      selectedNodes={selectedNodes}
                      onRemoveNode={toggleNode}
                      onGenerate={handleSearch}
                      isGenerating={isSearching}
                      hideButton
                      title="Selected Vibes"
                      emptyMessage="Pick nodes from the graph to define genre, mood, texture, and energy."
                      minSelections={1}
                      className="border-white/0 bg-transparent p-0 shadow-none"
                    >
                      {/* Extra vibes — inline with node chips, separated by a subtle divider */}
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        {extraVibes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {extraVibes.map((v, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{
                                  background: 'rgba(251,191,36,0.12)',
                                  border: '1px solid rgba(251,191,36,0.28)',
                                  color: 'rgba(253,186,116,0.9)',
                                }}
                              >
                                {v}
                                <button
                                  onClick={() => setExtraVibes(prev => prev.filter((_, j) => j !== i))}
                                  className="opacity-60 hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
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
                    </VibePanel>

                    {/* Find Blueprints button — below the whole vibes block */}
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || selectedNodes.length === 0}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
                        boxShadow: '0 0 24px rgba(249,115,22,0.35)',
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
          </aside>
        </div>
      </div>

      {/* Floating title */}
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
    </div>
  );
};

export default Index;
