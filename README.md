# GrooveForge

**Search by vibe. Generate by blueprint.**

[![Live App](https://img.shields.io/badge/Live%20App-groove--forge.vercel.app-brightgreen?style=flat-square&logo=googlechrome&logoColor=white)](https://groove-forge.vercel.app)
[![API](https://img.shields.io/badge/API-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://grooveforge-production.up.railway.app/health)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs%20Music%20API-FF6B35?style=flat-square&logoColor=white)](https://elevenlabs.io)
[![Turbopuffer](https://img.shields.io/badge/Turbopuffer-Vector%20DB-7C3AED?style=flat-square&logoColor=white)](https://turbopuffer.com)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![ElevenHacks](https://img.shields.io/badge/Built%20for-ElevenHacks-FF6B35?style=flat-square&logoColor=white)](https://elevenlabs.io)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)

> Every musician has a tune in mind.
>
> What if you could search and create music by feel, generate songs by vibe, play a song to create music Shazam-style, fuse genres into entirely new sounds, and transform lyrics into fully composed songs?
>
> Meet GrooveForge — **THE ULTIMATE AI TOOLKIT FOR ORIGINAL MUSIC CREATION.**

<!-- Screenshot: Full app hero — replace with actual screenshot -->
<p align="center">
  <img src="images/0-grooveforge-hero.png" alt="GrooveForge — Search by vibe. Generate by blueprint." width="700" />
</p>

---

## Table of Contents

- [What is GrooveForge?](#what-is-grooveforge)
- [How It Works](#how-it-works)
- [Input Modes](#input-modes)
- [Architecture](ARCHITECTURE.md)
- [Datasets](#datasets)
- [Data Pipeline](#data-pipeline)
- [Generation Modes](#generation-modes)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Running Locally](#running-locally)
- [Copyright-Safe by Design](#copyright-safe-by-design)

---

## What is GrooveForge?

GrooveForge is a **retrieval-augmented music creation system** — THE ULTIMATE AI TOOLKIT FOR ORIGINAL MUSIC CREATION.

Instead of describing music in the abstract, you search by the actual structural properties that make music sound the way it does — key, tempo, mood, instrumentation, lyrical themes. GrooveForge gives you four powerful ways to create:

- **Vibe Graph** — Click genre, mood, tempo, key, and theme nodes to compose a vibe
- **Sound Match** — Play a song. GrooveForge extracts its sonic fingerprint and generates something completely original in the same feel — Shazam, but for creation
- **Text-to-Music** — Describe what you want to create using natural language
- **Lyrics-to-Music** — Transform written lyrics into a fully composed song

At its core, GrooveForge indexes **millions of audio blueprints** enriched with features that define a song's DNA: genre, mood, key, tempo, energy, danceability, acousticness, valence, instrumentalness, and vocal characteristics. By retrieving and analyzing the closest matches, it generates original compositions grounded in real musical structure — ensuring precision, originality, and creative control.

Every generated track comes with a visible **reasoning trail** — the exact blueprint cards that shaped it — so you can see *why* it sounds the way it does. No black boxes. No hallucinated characteristics.

---

## How It Works

**1. Describe your vibe** — Select nodes in the graph, type a natural-language description, paste original lyrics, or just play a song you love and let GrooveForge extract the vibe.

**2. Retrieve blueprints** — Your input is searched across millions of indexed tracks to find the closest musical matches by feel, genre, mood, key, tempo, and instrumentation. The top 5–10 blueprints are surfaced and ranked.

**3. Aggregate traits** — The retrieved blueprints are collapsed into a generation profile: average BPM, dominant key and mode, most common genre and mood, merged instrumentation.

**4. Generate your track** — Gemini synthesizes a music prompt strictly from the retrieved blueprint traits and sends it to ElevenLabs Music API to produce an original composition. In Advanced mode, lyrics are placed section by section — never mixed into style guidance.

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

Type anything: `"moody synthwave, 110 BPM, instrumental"` or `"upbeat pop, female vocals, summer road trip"`. Your description is embedded and searched across millions of indexed tracks to find the closest blueprint matches.

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

Just hit play on any song you love. Gemini extracts the sonic fingerprint: BPM, key, mode, mood, texture, instrumentation. Those traits drive blueprint retrieval across millions of tracks, and GrooveForge generates something completely original in the same vibe. The artist name and song title never reach ElevenLabs — only the derived feel does.

<!-- Screenshot: Sound Match mode — replace with actual screenshot -->
<p align="center">
  <img src="images/4-sound-match.png" alt="Sound Match — play any song, get an original track in the same vibe" width="700" />
</p>

### Generated History

Every track you generate is saved locally (localStorage). Replay any track, rename it, or download the MP3. History persists across sessions.

<!-- Screenshot: Generated History tab — replace with actual screenshot -->
<p align="center">
  <img src="images/5-history-tab.png" alt="Generated History — replay, rename, download" width="700" />
</p>

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram and endpoint reference.

---

## Datasets

GrooveForge's blueprint index is built on four open datasets. Only structured metadata and derived features are used — no audio files are stored or processed.

| Dataset | Size | What it contributes |
|---------|------|---------------------|
| **Million Song Dataset (MSD)** | ~1M tracks | The backbone. Provides BPM, key, mode, loudness, artist familiarity, and release year for a million songs. |
| **LP-MusicCaps-MSD** | ~513K tracks | MSD tracks enriched with human-written captions from the MusicCaps annotation project. It provides rich natural-language descriptions of mood, texture, instrumentation, and genre — the primary retrieval anchor for each blueprint's `text_description`. |
| **Free Music Archive (FMA)** | ~106K tracks | Creative Commons licensed tracks with genre labels, Echonest audio features (valence, energy, danceability, instrumentalness, acousticness), and track-level metadata. Covers a wide range of independent and niche genres. |
| **MusicCaps** | ~5.5K tracks | A high-quality, human-annotated evaluation set from Google DeepMind. Used to validate caption quality and tag vocabulary — but instrumental in shaping the genre/mood classification vocabulary. |

Together these datasets cover mainstream, indie, electronic, classical, world music, and everything in between — giving retrieval broad coverage across moods, genres, keys, and tempos.

---

## Data Pipeline

The blueprint index was built in three offline stages. All scripts live in `backend/scripts/`.

### Stage 1 — Raw datasets → Blueprint Parquets

```
ingest_blueprints.py
  LP-MusicCaps-MSD (513,977 tracks)  → data/blueprints_lp_msd.parquet
  FMA              (106,574 tracks)  → data/blueprints_fma.parquet
```

For LP-MusicCaps-MSD:
- Tags parsed and classified into genre / mood / themes via vocabulary sets
- Vocal type inferred from tag strings (`female vocal`, `male vocal`, `instrumental`)
- Energy derived from loudness: `(loudness + 25) / 25`, clamped to `[0, 1]`
- `text` field assembled from `caption_summary` + `caption_writing` + tags + key/mode/BPM

For FMA:
- Genre from `genre_top`; mood derived from echonest valence threshold (>0.6 → upbeat, <0.3 → melancholic)
- Vocal type from instrumentalness threshold (>0.8 → instrumental)
- `text` field assembled from title + genre + descriptors + BPM + mood

### Stage 2 — Parquets → Turbopuffer

```
embed_blueprints.py
  blueprints_lp_msd.parquet  → Turbopuffer namespace lp_msd_minilm  (513,977 records)
  blueprints_fma.parquet     → Turbopuffer namespace fma_minilm     (106,574 records)
```

- Embedding model: `sentence-transformers/all-MiniLM-L6-v2` (384-dim, L2-normalized)
  - **During data pipeline (local):** The model was run locally via the `sentence-transformers` Python package — no GPU required. `all-MiniLM-L6-v2` is small enough to encode comfortably on CPU, producing ~1,000 vectors/sec and making it practical to embed all 620K+ blueprint records in a single offline run. Running it locally meant zero API cost for the bulk embedding pass and no rate-limit concerns.
  - **At inference (OpenRouter):** For query embedding at request time, we switched to the same model served via the [OpenRouter API](https://openrouter.ai). This avoids bundling the model weights in the Railway server container, keeps the deployment lightweight, and centralizes access with a single API key. The vectors are dimensionally identical (384-dim, L2-normalized), so ANN queries work seamlessly against the locally-built index.
  - Batch encode: 256 rows per encode call; upsert 500 rows per Turbopuffer write call
- Schema: `text` (full-text search enabled), plus filterable string attributes (source, genre, mood, vocal_type, key, mode, mode_key) and numeric attributes (bpm, year, energy, acousticness, valence, danceability, instrumentalness, artist_familiarity)
- Checkpointed: progress saved to `data/.embed_checkpoints/` so a killed run resumes from the last successful batch

Both namespaces are queried concurrently at runtime via `asyncio.gather`. Results are merged with **Reciprocal Rank Fusion (RRF, k=60)**.

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

**Blueprint Cards**
<p align="center">
  <img src="images/6-blueprint-cards.png" alt="Blueprint cards — BPM chip, key badge, energy bar, genre" width="500" />
</p>

**Generated Track**
<p align="center">
  <img src="images/7-generation-result.png" alt="Generated track hero — audio player, reasoning trail" width="500" />
</p>

**Review Composition Plan**
<p align="center">
  <img src="images/8-review-modal.png" alt="Review composition plan before sending to ElevenLabs" width="500" />
</p>

**Generation Overlay**
<p align="center">
  <img src="images/9-generating-overlay.png" alt="Animated two-phase loading overlay" width="500" />
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

## Copyright-Safe by Design

No copyrighted material ever reaches ElevenLabs — by design, not accident.

- **Metadata only** — blueprints are structured features (BPM, key, genre, energy) and human-written captions. No audio is stored or processed.
- **Artist & title firewall** — names and titles are stripped before anything reaches Gemini or ElevenLabs. Only derived traits flow into generation.
- **`text_description` excluded from LLM context** — free-text fields stay retrieval-only (BM25); never passed to Gemini as they may embed real artist references.
- **Original output** — ElevenLabs generates a brand-new composition. Blueprint retrieval shapes the style; it reproduces nothing.

---

## License

<p>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" />
  </a>
</p>

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
