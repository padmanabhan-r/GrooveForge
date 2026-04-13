import { useState, useCallback, useEffect } from 'react';
import { GenerateResponse } from '@/lib/api';

export interface HistoryEntry {
  id: string;
  name: string;
  generatedAt: number; // unix ms
  result: GenerateResponse;
}

const STORAGE_KEY = 'grooveforge_history';
const MAX_ENTRIES = 50;

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Strip bulky fields before persisting. HistoryPanel only needs:
 * audio_url, aggregated, blueprints.length.
 * Drop text_description/tags/caption_summary from blueprints (can be KB each)
 * and composition_plan (large multi-section object in advanced mode).
 */
function serializeEntries(entries: HistoryEntry[]): HistoryEntry[] {
  return entries.map(e => ({
    ...e,
    result: {
      ...e.result,
      composition_plan: null,
      blueprints: e.result.blueprints.map(bp => ({
        ...bp,
        text_description: '',
        tags: '',
        caption_summary: '',
      })),
    },
  }));
}

function save(entries: HistoryEntry[]): void {
  const attempts = [entries, entries.slice(0, 20), entries.slice(0, 5)];
  for (const batch of attempts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeEntries(batch)));
      return;
    } catch {
      // quota exceeded — try a smaller batch
    }
  }
  // All attempts failed — clear rather than crash
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(load);

  useEffect(() => {
    save(entries);
  }, [entries]);

  const addEntry = useCallback((result: GenerateResponse) => {
    const dt = result.display_tags;
    const genre = dt?.genre || result.aggregated?.genre_cluster || '';
    const mood  = dt?.mood  || result.aggregated?.mood_cluster  || '';
    const bpm   = dt?.bpm   || (result.aggregated?.avg_bpm > 0 ? Math.round(result.aggregated.avg_bpm) : 0);
    const parts = [genre, mood].filter(Boolean);
    if (bpm > 0) parts.push(`${bpm} BPM`);
    const label = parts.join(' · ') || 'Generated Track';
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: label,
      generatedAt: Date.now(),
      result,
    };
    setEntries(prev => [entry, ...prev].slice(0, MAX_ENTRIES));
  }, []);

  const renameEntry = useCallback((id: string, name: string) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, name } : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, addEntry, renameEntry, removeEntry };
}
