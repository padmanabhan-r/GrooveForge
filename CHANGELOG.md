# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Data Pipeline** section — three-stage build: raw data → PostgreSQL → blueprint parquets → Turbopuffer
- Expanded "How It Works" with RRF merge, concurrent namespace queries, and trait aggregation
- Four input modes aligned with the ElevenHacks hackathon description
- `ARCHITECTURE.md` — architectural diagram extracted from README
- `CHANGELOG.md` — this file

### Changed
- **Free-Text Search** → **Text-to-Music**
- **Artist-Neighborhood Search** → **Sound Match**
- "What is GrooveForge" now lists the four creation modes with one-line descriptions

### Removed
- **API Reference** section from README

## [1.0.0] — 2026-04-13

### Added
- Vibe Graph — click genre/mood/tempo/key/theme nodes to compose a vibe
- Text-to-Music — natural language vibe search with hybrid ANN + BM25 retrieval
- Lyrics-to-Music — paste lyrics, get a fully composed track (songwriter mode)
- Sound Match — upload or record a reference clip, find matching blueprints Shazam-style
- Generated History — localStorage-backed track history with replay, rename, download
- Blueprint reasoning trail — every generated track shows the exact blueprints that shaped it
- Simple + Advanced generation modes (prompt vs. composition plan)
- Review Before Generate — dry-run preview of prompt/plan before committing
- Two Turbopuffer namespaces (`lp_msd_minilm` + `fma_minilm`, 620K+ total records)
- Reciprocal Rank Fusion (RRF, k=60) merging across 4 ranked result lists
- Artist firewall — artist names from retrieval never passed to ElevenLabs
- Lyrics isolation — user lyrics placed only in ElevenLabs `lines` fields