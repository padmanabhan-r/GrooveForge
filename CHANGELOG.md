# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] — 2026-04-13

GrooveForge is a **retrieval-augmented music creation system** — THE ULTIMATE AI TOOLKIT FOR ORIGINAL MUSIC CREATION.

### What It Does

Music discovery is broken. Song titles tell you nothing about feel. Artist names lock you into what you already know. Playlists are curated by someone else's taste. GrooveForge starts where every other tool stops: with the **vibe itself**.

Instead of describing music in the abstract, you search by the actual structural properties that make music sound the way it does — key, tempo, mood, instrumentation, lyrical themes. GrooveForge gives you four powerful ways to create:

- **Vibe Graph** — Click genre, mood, tempo, key, and theme nodes to compose a vibe. Every node selection tightens the search query.
- **Text-to-Music** — Type a natural-language description: `"moody synthwave, 110 BPM, instrumental"`. Your description is embedded with `all-MiniLM-L6-v2` and searched with hybrid ANN + BM25 retrieval across both namespaces.
- **Lyrics-to-Music** — Paste original lyrics. Gemini analyzes emotional tone, themes, energy level, and rhythmic structure. The derived traits drive blueprint retrieval. Lyrics are placed only in ElevenLabs `lines` fields — never mixed with style guidance.
- **Sound Match** — Upload or record a reference clip. Gemini analyzes it for BPM, key, mood, texture, and instrumentation. Those derived traits drive blueprint retrieval — no audio file is ever stored or processed beyond the analysis step.

At its core, GrooveForge indexes **620,000+ audio blueprints** enriched with features that define a song's DNA: genre, mood, key, tempo, energy, danceability, acousticness, valence, instrumentalness, and vocal characteristics.

### How It Works

**1. Describe your vibe** — Select nodes, type a description, paste lyrics, or record a clip.

**2. Retrieve blueprints** — Input is embedded with `all-MiniLM-L6-v2` and sent as a hybrid ANN + BM25 query to Turbopuffer across two namespaces simultaneously (`lp_msd_minilm` + `fma_minilm`). Both namespaces are queried concurrently via `asyncio.gather`, and all four ranked result lists (ANN + BM25 per namespace) are merged using **Reciprocal Rank Fusion (RRF, k=60)** to produce a unified, deduplicated ranking of the closest 5–10 blueprints.

**3. Aggregate traits** — Blueprint metadata is collapsed into a generation profile: average BPM, dominant key/mode, most-frequent genre and mood clusters, merged instrumentation list.

**4. Generate your track** — Gemini synthesizes a grounded text prompt (simple mode) or structured composition plan (advanced mode) strictly from the retrieved blueprint traits. ElevenLabs Music API produces the audio. Lyrics are placed only in ElevenLabs `lines` fields per section, never mixed with style guidance.

Every generated track comes with a visible **reasoning trail** — the exact blueprint cards and aggregated profile that drove the generation. No black boxes. No hallucinated characteristics.

### Generation Modes

**Simple (Prompt)** — Fast iteration. One text prompt derived from aggregated blueprint traits sent to ElevenLabs.

**Advanced (Composition Plan)** — Structured songs with section-level control (intro/verse/chorus/bridge/outro), lyric placement per section, local style guides, and a `negative_global_styles` field to suppress unwanted traits.

Both modes support **Review Before Generate** — a dry-run that shows you the exact prompt or composition plan before committing to an ElevenLabs call.

### Data Pipeline

The blueprint index was built in three offline stages:

**Stage 1 — Raw datasets → Blueprint Parquets**
- `ingest_blueprints.py`: LP-MusicCaps-MSD (513,977 tracks) → `blueprints_lp_msd.parquet`; FMA (106,574 tracks) → `blueprints_fma.parquet`
- For MSD: tags parsed into genre/mood/themes via vocabulary sets; vocal type inferred from tag strings; energy derived from loudness; `text` field assembled from captions + tags + key/mode/BPM
- For FMA: genre from `genre_top`; mood from echonest valence threshold; vocal type from instrumentalness threshold

**Stage 2 — Parquets → Turbopuffer**
- `embed_blueprints.py`: `sentence-transformers/all-MiniLM-L6-v2` embedding (384-dim, L2-normalized); 256 rows per encode, 500 rows per upsert; checkpointed to `data/.embed_checkpoints/`
- Schema: `text` (full-text search enabled), plus filterable string and numeric attributes
- Two namespaces: `lp_msd_minilm` (513,977 records) + `fma_minilm` (106,574 records)

### Turbopuffer Retrieval

Query embedding via `all-MiniLM-L6-v2` through OpenRouter. Each namespace runs a hybrid ANN + BM25 query via `multi_query`. Both namespaces queried concurrently with `asyncio.gather`. Results merged with **RRF (k=60)** — deduplication across 4 ranked lists (lp_ann, lp_bm25, fma_ann, fma_bm25). Metadata filters (BPM range, vocal_type) applied to both ANN and BM25 sub-queries.

### Artist Firewall

Artist names and song titles from retrieved blueprints are **never** passed to Gemini or ElevenLabs. Only derived traits (genre, BPM, key, mood, instrumentation, energy) are used.

### Generated History

Every track generated is saved locally (localStorage). Replay any track, rename it, or download the MP3. History persists across sessions.

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Framer Motion, react-flow, Radix UI
- **Backend**: FastAPI, Python 3.13+, `uv`, Pydantic, asyncio
- **AI & Music**: ElevenLabs Music API (prompt + composition-plan), Google Gemini 2.5-flash
- **Retrieval**: Turbopuffer — ANN + BM25 hybrid, metadata filters, RRF merge across 2 namespaces
- **Embeddings**: `all-MiniLM-L6-v2` via OpenRouter API (384-dim)
- **Data Sources**: LP-MusicCaps-MSD (513K), Free Music Archive (106K), MSD full (1M), MusicCaps (5.5K)
- **Deployment**: Railway (backend) + Vercel (frontend)

---

## [1.1.0] — 2026-04-14

### Added
- **Data Pipeline** section in README — three-stage build documented with specifics on each script, embedding model, schema, and checkpointing
- Expanded "How It Works" with RRF merge explanation, concurrent namespace queries, and trait aggregation
- Four input modes in README aligned with the ElevenHacks hackathon description
- `ARCHITECTURE.md` — full ASCII system diagram (endpoints, Turbopuffer namespaces, LLM tasks) extracted from README
- `CHANGELOG.md` — this file tracking all notable changes

### Changed
- **Free-Text Search** → **Text-to-Music** (Input Modes)
- **Artist-Neighborhood Search** → **Sound Match** (Input Modes)
- "What is GrooveForge" now lists the four creation modes with one-line descriptions
- README Table of Contents updated: Architecture now links to `ARCHITECTURE.md` instead of anchor

### Removed
- **API Reference** section from README (migrated to ARCHITECTURE.md)

---

## [1.2.0] — 2026-04-16

### Added
- **Datasets section** in README — LP-MusicCaps-MSD (513K), FMA (106K), MSD full (1M), MusicCaps (5.5K) with per-dataset contribution descriptions
- **Copyright-Safe by Design section** — documents the four-layer safety approach: metadata-only, artist/title firewall, `text_description` excluded from LLM context, original output from ElevenLabs
- **Generated History** — every track saved to localStorage; replay, rename, or download MP3 across sessions
- **Track delete** — remove individual entries from generated history

### Changed
- **Sound Match mode** clarified: accepts a song played to the microphone only — not humming, naming, or recording original audio. Artist name and song title are extracted by Gemini locally and never sent to ElevenLabs; only derived sonic traits (BPM, key, mood, texture, instrumentation) drive retrieval and generation
- **Embedding split**: offline pipeline uses `sentence-transformers/all-MiniLM-L6-v2` locally on CPU (~1K vecs/sec, zero API cost for 620K+ records); query-time embedding served via OpenRouter — identical 384-dim L2-normalized vectors, no model weights bundled in the Railway container
- **Data pipeline section** condensed — collapsed to two stages (datasets → parquets → Turbopuffer), tightened embedding description
- **Blueprint Schema section** removed from README — schema is canonical in `CLAUDE.md`
- **README badges** switched to `flat-square` style
- **License** settled at CC BY 4.0 (reverted from Apache 2.0)

### Fixed
- Generate button stayed hidden when the blueprint list grew long — list is now scrollable, button always visible
- Blueprint list scroll broken — added `min-h-0` to the flex child so `overflow-y-auto` takes effect
- `pydantic-settings` rejected unknown env vars with `extra_forbidden` — added `extra="ignore"` to `Settings`
- Added visual border separator between the blueprint list and generation controls