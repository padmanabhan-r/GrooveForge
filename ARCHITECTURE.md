# Architecture

```
Browser (React 18 + TypeScript + Vite)
  ├─ ModeSwitcher: Graph | Text | Lyrics | Sound | History
  ├─ VibeGraph (react-flow): Genre / Mood / Key / Tempo / Instrumentation / Theme nodes
  ├─ InputPanels: free-text search, lyrics textarea, audio upload/record
  ├─ BlueprintDeck: toggle blueprints in/out, pop-out dialog, generation mode, track length
  ├─ GeneratingOverlay: two-phase animated loading (Blueprint Discovery → Music Generation)
  ├─ ReviewModal: preview prompt/plan before sending to ElevenLabs
  ├─ GenerationResult: audio player, aggregated traits, prompt inspector, reasoning trail
  ├─ LyricsAnalysisCard: mood/theme chips, energy bar, suggested genres, vocal style
  ├─ SoundAnalysisCard: BPM estimate, key, mood, texture tags
  ├─ HistoryPanel: localStorage-backed track list with player, rename, download
  └─ CompositionPlanView: global styles + per-section cards with lyrics preview

Backend (FastAPI)
  POST /api/search
    └── [concurrent] Turbopuffer hybrid retrieval (ANN + BM25 + metadata filters)
          → RRF merge across lp_msd_minilm + fma_minilm namespaces
          → Blueprint aggregation → { blueprints[], aggregated{} }

  POST /api/generate
    ├── [concurrent] Turbopuffer retrieval (both namespaces, asyncio.gather)
    ├── Gemini synthesis → simple text prompt or structured composition plan
    └── ElevenLabs Music API → audio file
          → { audio_url, prompt_used, composition_plan, blueprints[], aggregated{} }

  POST /api/preview
    └── Same as /api/generate but skips ElevenLabs — returns prompt/plan for review

  POST /api/analyze-lyrics
    ├── Gemini extracts: mood[], themes[], energy, suggested_genres[], vocal_style, search_query
    └── Turbopuffer retrieval on search_query → { analysis, blueprints[], aggregated{} }

  POST /api/analyze-sound
    ├── Gemini audio analysis: BPM, key, mood, texture, instrumentation
    └── Turbopuffer retrieval on derived traits → { analysis, blueprints[], aggregated{} }

  GET /api/health

Turbopuffer namespaces (active):
  lp_msd_minilm  — 513,977 records, 384-dim (all-MiniLM-L6-v2)
  fma_minilm     — 106,574 records, 384-dim (all-MiniLM-L6-v2)
  Both queried concurrently via asyncio.gather, merged with Reciprocal Rank Fusion (RRF)

LLM: Google Gemini 2.5-flash (google-genai SDK)
  synthesize_simple    → single text prompt grounded in blueprint traits
  synthesize_advanced  → structured composition plan (intro/verse/chorus/bridge/outro)
  analyze_lyrics       → mood / themes / energy / genres / vocal_style / search_query
  analyze_sound        → BPM / key / mood / texture / instrumentation from audio
```