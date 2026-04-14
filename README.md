# GrooveForge

**Search by vibe. Generate by blueprint.**

[![Live App](https://img.shields.io/badge/Live%20App-groove--forge.vercel.app-brightgreen?style=flat&logo=googlechrome&logoColor=white)](https://groove-forge.vercel.app)
[![API](https://img.shields.io/badge/API-Railway-0B0D0E?style=flat&logo=railway&logoColor=white)](https://grooveforge-production.up.railway.app/health)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs%20Music%20API-FF6B35?style=flat&logoColor=white)](https://elevenlabs.io)
[![Turbopuffer](https://img.shields.io/badge/Turbopuffer-Vector%20DB-7C3AED?style=flat&logoColor=white)](https://turbopuffer.com)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=flat&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![ElevenHacks](https://img.shields.io/badge/Built%20for-ElevenHacks-FF6B35?style=flat&logoColor=white)](https://elevenlabs.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

> Music discovery is broken. Song titles tell you nothing about feel. Artist names lock you into what you already know. Playlists are curated by someone else's taste.
>
> GrooveForge starts where every other tool stops: with the **vibe itself**. Pick a mood, a genre, a tempo, a key — and get a completely original track built from the closest musical blueprints ever indexed.

<!-- Screenshot: Full app hero — replace with actual screenshot -->
<p align="center">
  <img src="images/0-grooveforge-hero.png" alt="GrooveForge — Search by vibe. Generate by blueprint." width="700" />
</p>

---

## Table of Contents

- [What is GrooveForge?](#what-is-grooveforge)
- [How It Works](#how-it-works)
- [Input Modes](#input-modes)
- [Architecture](#architecture)
- [Data Pipeline](#data-pipeline)
- [Blueprint Schema](#blueprint-schema)
- [Generation Modes](#generation-modes)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Running Locally](#running-locally)
- [Demo Vibes](#demo-vibes)
- [Data & Legal](#data--legal)

---

## What is GrooveForge?

GrooveForge is a **retrieval-augmented music creation system** — THE ULTIMATE AI TOOLKIT FOR ORIGINAL MUSIC CREATION.

Instead of describing music in the abstract, you search by the actual structural properties that make music sound the way it does — key, tempo, mood, instrumentation, lyrical themes. GrooveForge gives you four powerful ways to create:

- **Vibe Graph** — Click genre, mood, tempo, key, and theme nodes to compose a vibe
- **Sound Match** — Upload or record a reference clip; Gemini analyzes it and finds matching blueprints Shazam-style
- **Text-to-Music** — Describe what you want to create using natural language
- **Lyrics-to-Music** — Transform written lyrics into a fully composed song

At its core, GrooveForge indexes **millions of audio blueprints** enriched with features that define a song's DNA: genre, mood, key, tempo, energy, danceability, acousticness, valence, instrumentalness, and vocal characteristics. By retrieving and analyzing the closest matches, it generates original compositions grounded in real musical structure — ensuring precision, originality, and creative control.

Every generated track comes with a visible **reasoning trail** — the exact blueprint cards that shaped it — so you can see *why* it sounds the way it does. No black boxes. No hallucinated characteristics.

---

## How It Works

**1. Describe your vibe** — Select nodes in the graph, type a natural-language description, paste original lyrics, or record a reference clip.

**2. Retrieve blueprints** — Your input is embedded with `all-MiniLM-L6-v2` and sent as a hybrid ANN + BM25 query to Turbopuffer across two namespaces simultaneously (`lp_msd_minilm` + `fma_minilm`, 620K+ tracks total). Both namespaces are queried concurrently via `asyncio.gather`, and all four ranked result lists (ANN + BM25 per namespace) are merged using **Reciprocal Rank Fusion (RRF, k=60)** to produce a unified, deduplicated ranking of the closest 5–10 blueprints.

**3. Aggregate traits** — Blueprint metadata is collapsed into a generation profile: average BPM, dominant key/mode, most-frequent genre and mood clusters, merged instrumentation list.

**4. Generate your track** — Gemini synthesizes a grounded text prompt (simple mode) or structured composition plan (advanced mode) strictly from the retrieved blueprint traits — no hallucinated characteristics. ElevenLabs Music API produces the audio. Lyrics are placed only in ElevenLabs `lines` fields per section, never mixed into style guidance.

Every track includes a visible **reasoning trail** — the exact blueprint cards and aggregated profile that drove the generation.

---

## Input Modes

### Vibe Graph

Click genre, mood, tempo, key, mode, instrumentation, and theme nodes to compose a vibe. Every node selection tightens the search query. The system maps your picks to a hybrid retrieval query plus metadata filters, surfaces the closest blueprints, and generates.

<!-- Screenshot: Vibe Graph mode — replace with actual screenshot -->
<p align="center">
  <img src="images/1-vibe-graph.png" alt="Vibe Graph — interactive node selection" width="700" />
</p>

### Text-to-Music

Type anything: `"moody synthwave, 110 BPM, instrumental"` or `"upbeat pop, female vocals, summer road trip"`. Your description is embedded with `all-MiniLM-L6-v2` and searched with hybrid ANN + BM25 retrieval across both namespaces simultaneously.

<!-- Screenshot: Free-Text Search mode — replace with actual screenshot -->
<p align="center">
  <img src="images/2-text-search.png" alt="Free-Text Search — natural language vibe search" width="700" />
</p>

### Lyrics-to-Music

Paste original lyrics. Gemini analyzes emotional tone, themes, energy level, and rhythmic structure. The derived traits drive blueprint retrieval — your lyrics never contaminate the style guidance. In Advanced mode, lyrics are placed in ElevenLabs `lines` fields per section; style guidance comes from the blueprints only.

<!-- Screenshot: Lyrics-to-Music mode — replace with actual screenshot -->
<p align="center">
  <img src="images/3-lyrics-mode.png" alt="Lyrics-to-Music — paste lyrics, get a track" width="700" />
</p>

### Sound Match

Record a reference clip or upload an audio file. Gemini analyzes the audio for BPM, key, mood, texture, and instrumentation signals. Those derived traits drive blueprint retrieval — no audio file is ever stored or processed beyond the analysis step.

<!-- Screenshot: Sound Match mode — replace with actual screenshot -->
<p align="center">
  <img src="images/4-sound-match.png" alt="Sound Match — hum it, find it" width="700" />
</p>

### Generated History

Every track you generate is saved locally (localStorage). Replay any track, rename it, or download the MP3. History persists across sessions.

<!-- Screenshot: Generated History tab — replace with actual screenshot -->
<p align="center">
  <img src="images/5-history-tab.png" alt="Generated History — replay, rename, download" width="700" />
</p>

---

## Architecture

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

---

## Data Pipeline

The blueprint index was built in three offline stages. All scripts live in `backend/scripts/`.

### Stage 1 — Raw data → PostgreSQL

```
load_msd_full.py
  MSD SQLite (track_metadata.db, 1M tracks)          → msd_songs table
       + HDF5 (msd_summary_file.h5, tempo/key/mode/loudness)
```

```python
# backend/scripts/load_msd_full.py
sqlite_conn → track_metadata.db (1M rows, basic metadata)
h5py.File   → msd_summary_file.h5 (audio features)
             → merged on track_id → PostgreSQL msd_songs table
```

Views `lp_musiccaps_msd_v` and `fma_all_v` sit above the raw MSD/FMA tables in PostgreSQL, exposing structured columns used directly by the ingest scripts.

### Stage 2 — PostgreSQL views → Blueprint Parquets

```
ingest_blueprints.py
  lp_musiccaps_msd_v (513,977 rows)  → data/blueprints_lp_msd.parquet
  fma_all_v          (106,574 rows)  → data/blueprints_fma.parquet
```

For `lp_musiccaps_msd_v`:
- Tags parsed and classified into genre / mood / themes via vocabulary sets
- Vocal type inferred from tag strings (`female vocal`, `male vocal`, `instrumental`)
- Energy derived from loudness: `(loudness + 25) / 25`, clamped to `[0, 1]`
- `text` field assembled from `caption_summary` + `caption_writing` + tags + key/mode/BPM + artist name

For `fma_all_v`:
- Genre from `genre_top`; mood derived from echonest valence threshold (>0.6 → upbeat, <0.3 → melancholic)
- Vocal type from instrumentalness threshold (>0.8 → instrumental)
- `text` field assembled from title + genre + descriptors + BPM + mood

### Stage 3 — Parquets → Turbopuffer

```
embed_blueprints.py
  blueprints_lp_msd.parquet  → Turbopuffer namespace lp_msd_minilm  (513,977 records)
  blueprints_fma.parquet     → Turbopuffer namespace fma_minilm     (106,574 records)
```

- Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384-dim, L2-normalized)
- Batch encode: 256 rows per encode call; upsert 500 rows per Turbopuffer write call
- Schema: `text` (full-text search enabled), plus filterable string attributes (source, genre, mood, vocal_type, key, mode, mode_key) and numeric attributes (bpm, year, energy, acousticness, valence, danceability, instrumentalness, artist_familiarity)
- Checkpointed: progress saved to `data/.embed_checkpoints/` so a killed run resumes from the last successful batch

Both namespaces are queried concurrently at runtime via `asyncio.gather`. Results are merged with **Reciprocal Rank Fusion (RRF, k=60)**.

---

## Blueprint Schema

Each indexed record is a **musical blueprint** — a structured metadata payload with a natural-language description as the retrieval anchor:

```json
{
  "id": "track_00123",
  "source_dataset": "LP-MusicCaps-MSD",
  "artist": "Example Artist",
  "genre": "synth-pop",
  "subgenre": "dream pop",
  "bpm": 118,
  "key": "C",
  "mode": "minor",
  "energy": 0.82,
  "acousticness": 0.11,
  "instrumentation": ["synth pads", "drum machine", "bass synth"],
  "themes": ["city", "night", "loneliness"],
  "vocal_type": "female vocals",
  "text_description": "A moody synth-pop track in C minor at 118 BPM with shimmering pads, pulsing bass, high energy, and lyrics about city lights and loneliness."
}
```

**Artist firewall:** Artist names and song titles from retrieved blueprints are **never** passed to Gemini or ElevenLabs. Only derived traits (genre, BPM, key, mood, instrumentation, energy) are used.

---

## Generation Modes

| Mode | Description |
|------|-------------|
| **Simple (Prompt)** | Fast iteration — one text prompt derived from aggregated blueprint traits sent to ElevenLabs |
| **Advanced (Composition Plan)** | Structured songs — section-level control (intro/verse/chorus/bridge/outro), lyric placement per section, local style guides |

Both modes support **Review Before Generate** — a dry-run that synthesizes and shows you the exact prompt or composition plan before committing to an ElevenLabs call. Approve or cancel.

Composition plan structure:
- `positive_global_styles` — genre, mood, tempo, key from aggregated blueprints
- `positive_local_styles` — per-section style directions
- `lines` — user lyrics only, placed per section (never mixed with style guidance)
- `negative_global_styles` — traits to suppress

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Framer Motion, react-flow, Radix UI |
| **Backend** | FastAPI, Python 3.13+, `uv`, Pydantic, asyncio |
| **AI & Music** | ElevenLabs Music API (prompt + composition-plan), Google Gemini 2.5-flash |
| **Retrieval** | Turbopuffer — ANN + BM25 hybrid, metadata filters, RRF merge across 2 namespaces |
| **Embeddings** | `all-MiniLM-L6-v2` via OpenRouter API (384-dim, no local GPU needed) |
| **Data Sources** | LP-MusicCaps-MSD (513K), Free Music Archive (106K), MSD full (1M), MusicCaps (5.5K) |
| **Deployment** | Railway (backend, Hobby tier) + Vercel (frontend, SPA rewrite) |

---

## Screenshots

<p align="center">
  <img src="images/6-blueprint-cards.png" alt="Blueprint cards — BPM chip, key badge, energy bar, genre" width="400" />
</p>
<p align="center">
  <img src="images/7-generation-result.png" alt="Generated track hero — audio player, reasoning trail" width="700" />
</p>
<p align="center">
  <img src="images/8-review-modal.png" alt="Review composition plan before sending to ElevenLabs" width="400" />
</p>
<p align="center">
  <img src="images/9-generating-overlay.png" alt="Animated two-phase loading overlay" width="700" />
</p>

---

## Running Locally

**Prerequisites:** Python 3.11+, Node 18+, [`uv`](https://docs.astral.sh/uv/)

```bash
# Backend
cd backend
uv sync
cp .env.example .env   # fill in API keys
uv run uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# Opens at http://localhost:8080
```

**Environment variables** (`backend/.env`):
```env
ELEVENLABS_API_KEY=...
TURBOPUFFER_API_KEY=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
```

**Data pipeline** (one-time setup — only needed to rebuild the Turbopuffer index):
```bash
cd backend
uv run python scripts/ingest_blueprints.py   # dataset → blueprint records
uv run python scripts/embed_blueprints.py    # embed + upsert into Turbopuffer
```

> The Turbopuffer namespaces (`lp_msd_minilm`, `fma_minilm`) are already populated in production. You only need to run the data pipeline if you're rebuilding the index from scratch.

---

## Demo Vibes

| Vibe selection | Expected output |
|---------------|----------------|
| Moody · Synthwave · Instrumental · 110–130 BPM | Dark electronic, minor key, no vocals |
| Upbeat · Pop · Female vocals · 120 BPM · Summer themes | Bright, major key, catchy hook |
| Psychedelic · Indie · Guitar · 90–100 BPM | Hazy, reverb-heavy, mid-tempo |
| Melancholic · Piano · Ballad · Slow | Sparse, cinematic, emotional |
| High energy · Hip-hop · 140 BPM · Urban themes | Punchy, rhythmic, bass-forward |

---

## Data & Legal

**Sources:** Million Song Dataset, Free Music Archive (FMA), MusicCaps, LP-MusicCaps-MSD — metadata and derived features only.

**No audio files are processed, stored, or used.** Only structured features (BPM, key, genre, energy) and descriptive text (mood, themes, instrumentation captions) are indexed.

**Generated music** is original output from ElevenLabs Music API — not a copy or derivative of any indexed track. Artist names from retrieval results are never passed to the generator.

---

## License

<p>
  <a href="https://creativecommons.org/licenses/by/4.0/">
    <img src="https://licensebuttons.net/l/by/4.0/88x31.png" alt="CC BY 4.0" />
  </a>
</p>

This project is licensed under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

You are free to share and adapt the material for any purpose, even commercially, as long as you give appropriate credit.
