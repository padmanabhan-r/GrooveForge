import { useState } from 'react';
import { Sparkles, X, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import BlueprintCard from '@/components/BlueprintCard';
import LyricsAnalysisCard from '@/components/LyricsAnalysisCard';
import { Blueprint, SearchResponse, GenerateResponse, LyricsAnalysis } from '@/lib/api';

interface BlueprintDeckProps {
  searchResults: SearchResponse;
  selectedBlueprintIds: Set<string>;
  onToggleBlueprint: (id: string) => void;
  generationMode: 'simple' | 'advanced';
  onGenerationModeChange: (m: 'simple' | 'advanced') => void;
  musicLengthMs: number;
  onMusicLengthChange: (ms: number) => void;
  reviewMode: boolean;
  onReviewModeChange: (v: boolean) => void;
  onGenerate: () => void;
  onReset: () => void;
  isGenerating: boolean;
  isPreviewing: boolean;
  error: string | null;
  lyricsAnalysis?: LyricsAnalysis | null;
}

export function BlueprintDeck({
  searchResults,
  selectedBlueprintIds,
  onToggleBlueprint,
  generationMode,
  onGenerationModeChange,
  musicLengthMs,
  onMusicLengthChange,
  reviewMode,
  onReviewModeChange,
  onGenerate,
  onReset,
  isGenerating,
  isPreviewing,
  error,
  lyricsAnalysis,
}: BlueprintDeckProps) {
  const selectedBlueprints = searchResults.blueprints.filter(bp => selectedBlueprintIds.has(bp.id));

  return (
    <>
      {/* Header */}
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

      {lyricsAnalysis && (
        <div className="mt-4">
          <LyricsAnalysisCard analysis={lyricsAnalysis} />
        </div>
      )}

      {/* Blueprint list */}
      <div className="mt-4 flex flex-col gap-2 flex-1">
        {searchResults.blueprints.map((bp, i) => (
          <BlueprintCard
            key={bp.id}
            blueprint={bp}
            rank={i + 1}
            selected={selectedBlueprintIds.has(bp.id)}
            onToggle={() => onToggleBlueprint(bp.id)}
            className="w-full"
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-col gap-3">
        {/* Generation mode toggle */}
        <div>
          <p className="text-[9px] uppercase tracking-[0.22em] text-white/38 mb-1.5">Generation Mode</p>
          <div className="flex gap-1.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['simple', 'advanced'] as const).map(m => (
              <button
                key={m}
                onClick={() => onGenerationModeChange(m)}
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
              { label: '2m', ms: 120000 },
            ] as const).map(({ label, ms }) => (
              <button
                key={ms}
                onClick={() => onMusicLengthChange(ms)}
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

      {/* Action buttons */}
      <div className="mt-3 flex flex-col gap-2">
        {/* Review mode toggle */}
        <button
          onClick={() => onReviewModeChange(!reviewMode)}
          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl transition-all"
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
          onClick={onGenerate}
          disabled={isGenerating || isPreviewing || selectedBlueprints.length === 0}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
            boxShadow: '0 0 24px rgba(249,115,22,0.35)',
          }}
        >
          <Sparkles size={15} />
          {isPreviewing ? 'Synthesizing…' : isGenerating ? 'Generating…' : reviewMode ? `Review & Generate · ${selectedBlueprints.length} blueprint${selectedBlueprints.length !== 1 ? 's' : ''}` : `Generate Music · ${selectedBlueprints.length} blueprint${selectedBlueprints.length !== 1 ? 's' : ''}`}
        </button>
        <button
          onClick={onReset}
          className="text-[10px] uppercase tracking-[0.2em] text-center transition-opacity hover:opacity-80"
          style={{ color: 'rgba(255,255,255,0.32)' }}
        >
          ← Search again
        </button>
      </div>
    </>
  );
}