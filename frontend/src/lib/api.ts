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
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  loudness: number;
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
  user_input: string;
  generation_mode: 'simple' | 'advanced';
  music_length_ms: number;
}

export interface CompositionSection {
  section_name: string;
  positive_local_styles: string[];
  negative_local_styles: string[];
  duration_ms: number;
  lines: string[];
}

export interface CompositionPlan {
  positive_global_styles: string[];
  negative_global_styles: string[];
  sections: CompositionSection[];
}

export interface GenerateResponse {
  audio_url: string;
  prompt_used: string;
  composition_plan: CompositionPlan | null;
  blueprints: Blueprint[];
  aggregated: AggregatedTraits;
}

export interface PreviewResponse {
  generation_mode: 'simple' | 'advanced';
  prompt_used: string;
  composition_plan: CompositionPlan | null;
}

export interface LyricsAnalysis {
  mood: string[];
  themes: string[];
  energy: number;
  suggested_genres: string[];
  vocal_style: string;
  search_query: string;
}

export interface LyricsSearchResponse {
  analysis: LyricsAnalysis;
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

export function previewGeneration(req: GenerateRequest): Promise<PreviewResponse> {
  return post<PreviewResponse>('/api/preview', req);
}

export function analyzeLyrics(lyrics: string): Promise<LyricsSearchResponse> {
  return post<LyricsSearchResponse>('/api/analyze-lyrics', { lyrics });
}

export function resolveAudioUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${BASE}${path}`;
}
