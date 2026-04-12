// API client for GrooveForge backend

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export interface Blueprint {
  id: string;
  source: string;
  title: string;
  artist: string;
  genre: string;
  genres_all: string;
  bpm: number;
  key: string;
  mode: string;
  energy: number;
  acousticness: number;
  valence: number;
  danceability: number;
  vocal_type: string;
  mood: string;
  themes: string;
  tags: string;
  caption_summary: string;
  text_description: string;
  similarity_score: number;
}

export interface AggregatedTraits {
  avg_bpm: number;
  mode_key: string;
  genre_cluster: string;
  mood_cluster: string;
  energy: number;
  vocal_type: string;
}

export interface SearchRequest {
  vibes: string[];
  free_text: string;
  bpm_lower: number | null;
  bpm_upper: number | null;
  key: string | null;
  vocal_type: string | null;
  artist?: string;
  top_k: number;
}

export interface SearchResponse {
  blueprints: Blueprint[];
  aggregated: AggregatedTraits;
}

export interface GenerateRequest {
  vibes: string[];
  free_text: string;
  blueprints: Blueprint[];
  bpm_lower: number | null;
  bpm_upper: number | null;
  lyrics: string;
  mode: 'prompt' | 'composition_plan';
}

export interface GenerateResponse {
  audio_url: string;
  prompt_used: string;
  blueprints: Blueprint[];
  aggregated: AggregatedTraits;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export function searchBlueprints(req: SearchRequest): Promise<SearchResponse> {
  return post<SearchResponse>('/api/search', req);
}

export function generateTrack(req: GenerateRequest): Promise<GenerateResponse> {
  return post<GenerateResponse>('/api/generate', req);
}

export function resolveAudioUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${BASE}${path}`;
}
