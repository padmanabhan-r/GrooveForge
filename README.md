# GrooveForge

**The ultimate musician's toolkit.**
**Your blueprint for original music.**

> Search by vibe. Generate by blueprint.

> Music discovery is broken. Song titles tell you nothing about feel. Artist names lock you into what you already know. Playlists are curated by someone else's taste.
>
> GrooveForge starts where every other tool stops: with the vibe itself. Pick a mood, a genre, a tempo, a key — and get a completely original track built from the closest musical blueprints in existence.

---

GrooveForge is a **retrieval-augmented music creation system**. Users search by feeling, structure, lyrics, or artist neighborhood. The app retrieves the closest musical blueprints from a Turbopuffer vector index, aggregates their traits into a generation profile, and produces a fresh original track via ElevenLabs Music API.

Every generated track comes with a visible **reasoning trail** — the blueprint cards that shaped it — so you can see *why* it sounds the way it does.

---

## Input Modes

### Graph Exploration
Click genre, mood, tempo, key, mode, instrumentation, and theme nodes to compose a vibe. The system maps your selection to a hybrid search query plus metadata filters, retrieves the 5–10 closest blueprints, and generates.

### Free-Text Vibe Search
Type `"moody synthwave, 110 BPM, instrumental"` or `"upbeat pop, female vocals, lyrics about summer road trips"`. Embedded and searched with hybrid ANN + BM25 retrieval.

### Lyrics-to-Music
Paste original lyrics. An LLM analyzes emotional tone and structure, finds matching blueprint neighborhoods, and builds a composition plan. Lyrics go into the `lines` field; derived style guidance drives the rest.

### Blueprint Remix
Select retrieved blueprints and request controlled variations — darker mood, higher tempo, cinematic feel, no vocals. The backend regenerates from a modified profile, keeping retrieval as the anchor.

### Artist-Neighborhood Search
Enter an artist as a shortcut into a musical neighborhood. The artist name is used only for retrieval — it is **never** passed into the ElevenLabs prompt. The system derives BPM range, key/mode, instrumentation, genre, and mood from the blueprints, then generates from those derived traits only.

---

## Architecture

```
Browser (React 18 + TypeScript + Vite)
  ├─ Graph UI (react-flow nodes: Genre / Mood / Key / Tempo / Instrumentation / Theme)
  ├─ Mode switcher: Graph | Text | Lyrics | Remix | Artist
  ├─ Blueprint reasoning trail (retrieved cards animate in)
  ├─ Audio player + waveform visualizer
  └─ POST /api/search  +  POST /api/generate

Backend (FastAPI)
  POST /api/search
    └── [concurrent] Turbopuffer hybrid retrieval across both namespaces
          └── LLM reads all retrieved rows → synthesizes unified blueprint

  POST /api/generate
    ├── [concurrent] Turbopuffer retrieval across both namespaces
    ├── LLM blueprint synthesis (assembles blueprint + composition plan from retrieved data)
    └── ElevenLabs Music API → audio stream
          └── { audio_url, prompt_used, blueprints[], aggregated{} }

Data Pipeline (one-time, already run)
  Raw tables → 2 PostgreSQL views → 6 Turbopuffer namespaces (2 per embedding model)
    lp_msd_minilm    — 513,977 records, 384-dim   (MiniLM, CPU — built first)
    fma_minilm       — 106,574 records, 384-dim   (MiniLM, CPU — built first)
    lp_msd_nemotron  — 513,977 records, 4096-dim  (llama-nemotron, Kaggle T4 GPU)
    fma_nemotron     — 106,574 records, 4096-dim  (llama-nemotron, Kaggle T4 GPU)
    lp_msd_clap      — 513,977 records, 512-dim   (CLAP text encoder — stretch goal)
    fma_clap         — 106,574 records, 512-dim   (CLAP text encoder — stretch goal)
  Active pair (config-driven): minilm → nemotron once indexed
  CLAP pair: audio-to-audio "Sounds Like" mode only
```

The active namespace pair is queried concurrently via `asyncio.gather`. The LLM sees the full retrieved pool and assembles the blueprint — `lp_msd_*` contributes captions and audio structure, `fma_*` contributes genre labels and energy/valence signals. Switch from MiniLM to Nemotron by changing two config values.

---

## Blueprint Schema

Each indexed record is a "musical blueprint" with a structured metadata payload and a natural-language description as the retrieval anchor:

```json
{
  "id": "track_00123",
  "source_dataset": "MSD + MusicCaps",
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

---

## Generation Modes

| Mode | When to use |
|------|-------------|
| **Prompt mode** | Fast iteration — one text prompt derived from aggregated blueprint traits |
| **Composition-plan mode** | Structured songs — section-level control, lyric placement, local style guides |

Composition plan structure:
- `positive_global_styles` — genre, mood, tempo, key from aggregated blueprints
- `positive_local_styles` — per-section style directions
- `lines` — user lyrics only (never mixed with style guidance)
- `negative_global_styles` — traits to suppress

---

## UI Design

Built to feel like a **professional musician's toolkit** — think Ableton meets Figma, not a generic SaaS dashboard.

**Color palette:** Deep graphite (`#111118`) base, dark navy panels (`#1A1A2E`), electric indigo accent (`#6366F1`), amber for active states, muted slate for inactive nodes. White for primary data text.

**Typography:** `Inter` for UI labels, `JetBrains Mono` for BPM/key/energy values — metrics read like a DAW readout.

**Key moments:**
- **Node selection:** Clicking a graph node pulses it with an indigo ring and animates edges to related nodes. Connected genres/moods highlight to reveal the vibe neighborhood.
- **Blueprint reveal:** Retrieved blueprint cards stagger in (100ms apart) with a slide-up + fade. Each card shows BPM chip, key chip, energy bar, instrumentation tags — all scannable at a glance.
- **Generation loading:** Animated waveform placeholder that morphs into the real waveform when audio lands.
- **Audio player:** Full-width waveform with amplitude-reactive bars. Shows prompt used, aggregated traits, and blueprint count alongside playback controls.
- **Reasoning trail:** Always visible below the player — shows which blueprints contributed to the current track, with their metadata and a similarity score.
- **Prompt transparency:** The exact prompt or composition plan sent to ElevenLabs expands on demand — so users understand what drove the generation.
- **Remix flow:** After playback, blueprint cards show "remix" affordances — sliders for mood and tempo offset, toggle for vocal/instrumental. Re-generates without losing the original.

**Component map:**
```
App Shell: dark graphite, fixed top nav, mode switcher tabs
GraphCanvas: react-flow graph, curated node layout, click-to-select multi-node
TextSearchBar: free-text input with embedding-powered suggestions
LyricsPanel: textarea + LLM tone analysis preview
BlueprintCard: BPM chip, key badge, energy bar, genre tag, similarity score
ReasoningTrail: horizontal scroll of BlueprintCards below the player
AggregatedProfile: avg BPM, mode key, genre cluster, mood cluster — shown before generating
AudioPlayer: waveform visualizer, play/pause, scrubber, prompt tooltip
RemixControls: mood slider, tempo delta, vocal toggle — appears after first generation
GenerateButton: prominent CTA, loading state shows animated waveform placeholder
ModeTab: Graph | Text | Lyrics | Remix | Artist — always visible
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Graph UI | react-flow |
| Animation | Framer Motion |
| Backend | FastAPI (Python), `uv` |
| Vector retrieval | Turbopuffer — 6 namespaces, ANN + BM25 hybrid, metadata filters |
| LLM synthesis | Anthropic Claude (blueprint + composition plan synthesis) |
| Music generation | ElevenLabs Music API (prompt + composition-plan modes) |
| Embeddings | `all-MiniLM-L6-v2` (384-dim, CPU — primary) · `nvidia/llama-embed-nemotron-8b` (4096-dim, Kaggle T4) · CLAP (512-dim, audio-to-audio) |
| Data sources | LP-MusicCaps-MSD (513K), MSD full (1M), FMA (106K), MusicCaps (5.5K) |
| Deployment | Docker + GCP Cloud Run |

---

## Local Setup

**Prerequisites:** Python 3.11+, Node 18+, `uv`

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
```

**Environment variables** (`backend/.env`):
```
ELEVENLABS_API_KEY=...
TURBOPUFFER_API_KEY=...
ANTHROPIC_API_KEY=...
```

**Data pipeline** (run once):
```bash
cd backend
uv run python scripts/ingest_blueprints.py   # processes dataset → blueprint records
uv run python scripts/embed_blueprints.py    # embeds + upserts into Turbopuffer
```

---

## API

```
POST /api/search
{
  "vibes": ["moody", "synthwave"],
  "bpm_lower": 100, "bpm_upper": 130,
  "key": "C minor",
  "vocal_type": "instrumental",
  "free_text": ""
}
→ { "blueprints": [...], "aggregated": { "avg_bpm": 118, "mode_key": "C minor", ... } }

POST /api/generate
{
  "blueprints": [...],         // from /api/search, or pass vibes directly
  "vibes": ["moody", "synthwave"],
  "bpm_lower": 100, "bpm_upper": 130,
  "lyrics": "",                // optional — songwriter mode
  "mode": "prompt"             // "prompt" | "composition_plan"
}
→ {
    "audio_url": "/static/audio/abc123.mp3",
    "prompt_used": "Moody synthwave instrumental, 118 BPM, C minor...",
    "blueprints": [...],
    "aggregated": { "avg_bpm": 118, "mode_key": "C minor", ... }
  }

GET /api/health   → system status
```

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

**Sources:** Million Song Dataset, Free Music Archive (FMA), MusicCaps, LP-MusicCaps — metadata and tags only.

**No audio files are processed, stored, or used.** Only structured features (BPM, key, genre, energy) and descriptive text (mood, themes, instrumentation captions).

**Generated music** is original output from ElevenLabs Music API — not a copy of any indexed track. Artist names from retrieval are never passed to the generator.
