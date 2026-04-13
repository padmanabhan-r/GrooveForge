import { useRef, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, Download, /* Trash2, */ Pencil, Check, X, Clock, Music2 } from 'lucide-react';
import { HistoryEntry } from '@/hooks/useHistory';
import { resolveAudioUrl } from '@/lib/api';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatTime(secs: number): string {
  if (!isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function HistoryTrack({
  entry,
  onRename,
  onRemove,
}: {
  entry: HistoryEntry;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { el.play(); }
  }, [playing]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed) onRename(entry.id, trimmed);
    else setDraft(entry.name);
    setEditing(false);
  }, [draft, entry.id, entry.name, onRename]);

  const cancelRename = useCallback(() => {
    setDraft(entry.name);
    setEditing(false);
  }, [entry.name]);

  const agg = entry.result.aggregated;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <audio
        ref={audioRef}
        src={resolveAudioUrl(entry.result.audio_url)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        preload="metadata"
      />

      {/* Top row: name + actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') cancelRename();
                }}
                className="flex-1 bg-transparent border-b border-indigo-400/60 text-white text-sm font-semibold outline-none pb-0.5 min-w-0"
              />
              <button onClick={commitRename} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                <Check size={14} />
              </button>
              <button onClick={cancelRename} className="text-white/30 hover:text-white/60 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <span className="text-sm font-semibold text-white truncate">{entry.name}</span>
              <button
                onClick={() => { setDraft(entry.name); setEditing(true); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white/35 hover:text-indigo-400"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          <p className="text-[11px] text-white/30 mt-0.5 flex items-center gap-1">
            <Clock size={10} />
            {formatDate(entry.generatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={resolveAudioUrl(entry.result.audio_url)}
            download
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/6 transition-all"
          >
            <Download size={14} />
          </a>
          {/* Delete button hidden for demo — preserve all generated tracks
          <button
            onClick={() => onRemove(entry.id)}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/8 transition-all"
          >
            <Trash2 size={14} />
          </button>
          */}
        </div>
      </div>

      {/* Player row */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{
            background: playing
              ? 'rgba(99,102,241,0.9)'
              : 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.4)',
          }}
        >
          {playing
            ? <Pause size={14} className="text-white" />
            : <Play  size={14} className="text-indigo-300 ml-0.5" />}
        </button>

        {/* Scrubber */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={e => {
              const t = parseFloat(e.target.value);
              setCurrentTime(t);
              if (audioRef.current) audioRef.current.currentTime = t;
            }}
            className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #6366f1 ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255,255,255,0.1) 0%)`,
            }}
          />
          <span className="text-[11px] font-mono text-white/35 shrink-0 w-16 text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Trait chips */}
      {agg && (
        <div className="flex flex-wrap gap-1.5">
          {agg.mode_key && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'rgba(165,168,255,0.85)', border: '1px solid rgba(99,102,241,0.2)' }}>
              {agg.mode_key}
            </span>
          )}
          {agg.avg_bpm > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono"
              style={{ background: 'rgba(245,158,11,0.12)', color: 'rgba(252,211,77,0.8)', border: '1px solid rgba(245,158,11,0.2)' }}>
              {Math.round(agg.avg_bpm)} BPM
            </span>
          )}
          {agg.genre_cluster && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {agg.genre_cluster}
            </span>
          )}
          {agg.mood_cluster && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {agg.mood_cluster}
            </span>
          )}
          {entry.result.blueprints?.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {entry.result.blueprints.length} blueprint{entry.result.blueprints.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function HistoryPanel({ entries, onRename, onRemove }: HistoryPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/55">Session + Local Storage</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white">Generated History</h2>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Music2 size={22} className="text-indigo-400/60" />
          </div>
          <p className="text-sm text-white/35">No tracks generated yet.</p>
          <p className="text-xs text-white/22">Generate your first track to see it here.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
          <AnimatePresence initial={false}>
            {entries.map(entry => (
              <HistoryTrack
                key={entry.id}
                entry={entry}
                onRename={onRename}
                onRemove={onRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
