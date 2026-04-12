import { AppMode } from './ModeSwitcher';
import { Search, Music, AudioWaveform, Sparkles } from 'lucide-react';

interface InputPanelsProps {
  mode: AppMode;
  onGenerate: () => void;
}

export default function InputPanels({ mode, onGenerate }: InputPanelsProps) {
  if (mode === 'graph') return null;

  return (
    <div
      className="w-full h-full rounded-[28px] border border-white/10 flex flex-col"
      style={{
        background: 'linear-gradient(180deg,rgba(10,16,32,0.88),rgba(8,12,24,0.74))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.32)',
      }}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-7 py-8 flex items-center justify-center">

        {mode === 'text' && (
          <div className="flex flex-col gap-5 w-full max-w-xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55 mb-1">Input</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Describe Your Vibe</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Write naturally — genre, mood, tempo, instruments, era. The more detail you give, the closer the match.
              </p>
            </div>

            <div className="relative mt-2">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="A nostalgic summer drive at sunset with synths and soft drums..."
                className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm text-white placeholder:text-white/28 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>

            <button
              onClick={onGenerate}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
                boxShadow: '0 0 24px rgba(249,115,22,0.35)',
              }}
            >
              <Sparkles size={15} /> Generate from Description
            </button>
          </div>
        )}

        {mode === 'lyrics' && (
          <div className="flex flex-col gap-5 w-full max-w-xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55 mb-1">Input</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Paste Your Lyrics</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                The app will analyze tone, rhyme density, and emotional arc to retrieve matching blueprints and wrap a track around your words.
              </p>
            </div>

            <textarea
              placeholder={"Write or paste your original lyrics here...\n\nThe app will analyze mood, rhythm, and theme to generate a matching track."}
              rows={10}
              className="w-full px-4 py-4 rounded-2xl text-sm text-white placeholder:text-white/28 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 resize-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />

            <button
              onClick={onGenerate}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 55%, #dc6b08 100%)',
                boxShadow: '0 0 24px rgba(249,115,22,0.35)',
              }}
            >
              <Music size={15} /> Generate from Lyrics
            </button>
          </div>
        )}

        {mode === 'sound' && (
          <div className="flex flex-col gap-5 w-full max-w-xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55 mb-1">Input</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Match a Sound</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Upload or record a reference clip. We'll identify its vibe, key, tempo, and texture — then find blueprints that match its feel.
              </p>
            </div>

            {/* Upload drop zone */}
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-2xl py-14 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px dashed rgba(255,255,255,0.12)',
              }}
            >
              <AudioWaveform size={32} className="text-white/20" />
              <p className="text-sm text-white/38">Drop an audio file here</p>
              <p className="text-xs text-white/22">MP3, WAV, M4A · max 60 s</p>
            </div>

            <button
              disabled
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.28)',
              }}
            >
              <AudioWaveform size={15} /> Coming soon
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
