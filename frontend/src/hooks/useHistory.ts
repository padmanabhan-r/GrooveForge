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

function save(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full — drop oldest
    const trimmed = entries.slice(0, MAX_ENTRIES - 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(load);

  useEffect(() => {
    save(entries);
  }, [entries]);

  const addEntry = useCallback((result: GenerateResponse) => {
    const genre = result.aggregated?.genre_cluster ?? '';
    const mood  = result.aggregated?.mood_cluster ?? '';
    const label = [genre, mood].filter(Boolean).join(' · ') || 'Generated Track';
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
