import { useRef, useState } from 'react';
import { AudioWaveform, Mic, Music, Sparkles, Square, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppMode } from './ModeSwitcher';

const MAX_RECORDING_SECONDS = 15;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

interface InputPanelsProps {
  mode: AppMode;
  freeText: string;
  onFreeTextChange: (v: string) => void;
  lyrics: string;
  onLyricsChange: (v: string) => void;
  audioFile: File | null;
  onAudioFileChange: (f: File | null) => void;
  onSearch: () => void;
  isSearching: boolean;
}

export default function InputPanels({
  mode,
  freeText,
  onFreeTextChange,
  lyrics,
  onLyricsChange,
  audioFile,
  onAudioFileChange,
  onSearch,
  isSearching,
}: InputPanelsProps) {
  const soundFileInputRef = useRef<HTMLInputElement>(null);
  const [soundDragActive, setSoundDragActive] = useState(false);
  const [recordingState, setRecordingState] = useState<'idle' | 'requesting' | 'recording' | 'done'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    mediaRecorderRef.current?.stop();
  }

  async function startRecording() {
    setRecordingState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: mimeType });
        const ext = mimeType === 'audio/webm' ? 'webm' : 'ogg';
        const file = new File([blob], `recording.${ext}`, { type: mimeType });
        onAudioFileChange(file);
        setRecordingState('done');
        setRecordingSeconds(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingState('recording');
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setRecordingState('idle');
    }
  }

  function handleRecordClick() {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle' || recordingState === 'done') {
      onAudioFileChange(null);
      startRecording();
    }
  }

  function handleSoundFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      return; // silently ignore — user sees nothing change, which is fine for now
    }
    setRecordingState('done');
    onAudioFileChange(file);
  }

  function handleSoundFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleSoundFile(file);
    e.target.value = '';
  }

  function handleSoundDragOver(e: React.DragEvent) {
    e.preventDefault();
    setSoundDragActive(true);
  }

  function handleSoundDragLeave() {
    setSoundDragActive(false);
  }

  function handleSoundDrop(e: React.DragEvent) {
    e.preventDefault();
    setSoundDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSoundFile(file);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Describe The Music You Want To Create</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Say anything — artist names, song titles, genres, moods, eras, vibes. We'll search the blueprint index for the closest matches and build from there.
              </p>
            </div>

            <textarea
              value={freeText}
              onChange={e => onFreeTextChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && freeText.trim()) {
                  e.preventDefault();
                  onSearch();
                }
              }}
              placeholder={"Something like Radiohead's OK Computer but more danceable, melancholic synthpop, 90 BPM, minor key..."}
              rows={5}
              className="w-full px-4 py-4 rounded-2xl text-sm text-white placeholder:text-white/28 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 resize-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />

            <button
              onClick={onSearch}
              disabled={isSearching || !freeText.trim()}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <Sparkles size={15} /> {isSearching ? 'Searching…' : 'Find Blueprints'}
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
              value={lyrics}
              onChange={e => onLyricsChange(e.target.value)}
              placeholder={"Write or paste your original lyrics here...\n\nThe app will analyze mood, rhythm, and theme to generate a matching track."}
              rows={10}
              className="w-full px-4 py-4 rounded-2xl text-sm text-white placeholder:text-white/28 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 resize-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />

            <button
              onClick={onSearch}
              disabled={isSearching || !lyrics.trim()}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <Music size={15} /> {isSearching ? 'Searching…' : 'Find Blueprints'}
            </button>
          </div>
        )}

        {mode === 'sound' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-xl">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55 mb-1">Input</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Match a Sound</h2>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Tap the button and play a song — we'll identify its vibe, key, tempo, and texture, then find blueprints that match its feel.
              </p>
            </div>

            {/* Shazam-style record button */}
            <div className="relative flex items-center justify-center">
              {/* Outer pulse ring — only visible while recording */}
              {recordingState === 'recording' && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 128,
                    height: 128,
                    border: '2px solid rgba(99,102,241,0.5)',
                  }}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.2, 0.7] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              {/* Second pulse ring */}
              {recordingState === 'recording' && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 128,
                    height: 128,
                    border: '2px solid rgba(99,102,241,0.3)',
                  }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.0, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />
              )}

              <motion.button
                onClick={handleRecordClick}
                disabled={recordingState === 'requesting'}
                whileTap={{ scale: 0.93 }}
                className="relative z-10 flex items-center justify-center rounded-full disabled:cursor-not-allowed"
                style={{
                  width: 96,
                  height: 96,
                  background: recordingState === 'recording'
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.9))'
                    : recordingState === 'done' && audioFile
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.2))'
                    : 'linear-gradient(135deg, rgba(99,102,241,0.75), rgba(79,70,229,0.75))',
                  border: recordingState === 'recording'
                    ? '2px solid rgba(165,168,255,0.5)'
                    : recordingState === 'done' && audioFile
                    ? '2px solid rgba(34,197,94,0.4)'
                    : '2px solid rgba(99,102,241,0.4)',
                  boxShadow: recordingState === 'recording'
                    ? '0 0 40px rgba(99,102,241,0.5)'
                    : '0 0 24px rgba(99,102,241,0.25)',
                }}
              >
                {recordingState === 'requesting' && (
                  <motion.div
                    className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
                {recordingState === 'recording' && (
                  <Square size={28} fill="white" className="text-white" />
                )}
                {(recordingState === 'idle' || (recordingState === 'done' && !audioFile)) && (
                  <Mic size={36} className="text-white" />
                )}
                {recordingState === 'done' && audioFile && (
                  <Mic size={36} className="text-emerald-300" />
                )}
              </motion.button>
            </div>

            {/* State label */}
            <div className="text-center -mt-2">
              {recordingState === 'idle' && (
                <p className="text-sm text-white/55">Tap to identify</p>
              )}
              {recordingState === 'requesting' && (
                <p className="text-sm text-white/55">Requesting mic…</p>
              )}
              {recordingState === 'recording' && (
                <p className="text-sm" style={{ color: 'rgba(165,168,255,0.9)' }}>
                  Listening… {recordingSeconds}s / {MAX_RECORDING_SECONDS}s
                </p>
              )}
              {recordingState === 'done' && audioFile && (
                <p className="text-xs text-emerald-400/80">Captured · tap to re-record</p>
              )}
            </div>

            {/* Captured file strip */}
            {audioFile && (
              <div
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <AudioWaveform size={14} className="text-indigo-400 flex-shrink-0" />
                <span className="flex-1 truncate text-xs text-white/70">{audioFile.name}</span>
                <span className="text-[10px] text-white/35 flex-shrink-0">{formatBytes(audioFile.size)}</span>
                <button
                  onClick={() => { onAudioFileChange(null); setRecordingState('idle'); }}
                  className="flex-shrink-0 text-white/35 hover:text-white/70 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/28">or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* File upload zone */}
            <input
              ref={soundFileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleSoundFileSelect}
            />
            <div
              onClick={() => soundFileInputRef.current?.click()}
              onDragOver={handleSoundDragOver}
              onDragLeave={handleSoundDragLeave}
              onDrop={handleSoundDrop}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl py-6 text-center cursor-pointer transition-all"
              style={{
                background: soundDragActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                border: soundDragActive
                  ? '1.5px dashed rgba(99,102,241,0.5)'
                  : '1.5px dashed rgba(255,255,255,0.1)',
              }}
            >
              <p className="text-xs text-white/38">Drop a file or click to browse</p>
              <p className="text-[10px] text-white/22">MP3, WAV, OGG, FLAC, AAC · max 10 MB</p>
            </div>

            {/* Find Blueprints */}
            <button
              onClick={onSearch}
              disabled={isSearching || !audioFile}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.24)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <Sparkles size={15} />
              {isSearching ? 'Analyzing…' : 'Find Blueprints'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
