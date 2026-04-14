"""
Build blueprint parquet files from PostgreSQL views.

Reads from:
  lp_musiccaps_msd_v  — 513,977 rows
  fma_all_v           — 106,574 rows

Outputs:
  data/blueprints_lp_msd.parquet
  data/blueprints_fma.parquet

Usage:
  cd /Users/paddy/Documents/Github/ElevenHacks/Week4_Project
  uv run python backend/scripts/ingest_blueprints.py
"""

import logging
import os
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"


def _pg_url() -> str:
    if url := os.environ.get("POSTGRES_URL"):
        return url
    env_path = ROOT / "backend" / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("POSTGRES_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("POSTGRES_URL not set")

PG_URL = _pg_url()

# ---------------------------------------------------------------------------
# Tag classification vocabulary
# ---------------------------------------------------------------------------
GENRE_TOKENS = {
    "rock", "pop", "jazz", "hip hop", "r&b", "rnb", "electronic", "punk",
    "metal", "folk", "country", "blues", "classical", "indie", "dance",
    "house", "techno", "trance", "reggae", "soul", "funk", "disco",
    "alternative", "hardcore", "screamo", "emo", "ambient", "rap", "trap",
    "edm", "dubstep", "synthpop", "new wave", "grunge", "psychedelic",
    "progressive", "experimental", "flamenco", "latin", "bossa nova",
    "world", "drum and bass", "electronica", "eurodance", "club dance",
}

MOOD_TOKENS = {
    "cathartic", "earnest", "urgent", "aggressive", "rebellious", "energetic",
    "rousing", "playful", "reflective", "intimate", "dramatic", "bittersweet",
    "melancholy", "exuberant", "fiery", "confident", "passionate", "stylish",
    "intense", "carefree", "boisterous", "freewheeling", "yearning", "lively",
    "romantic", "celebratory", "sad", "happy", "angry", "calm", "soothing",
    "uplifting", "dark", "moody", "nostalgic", "euphoric", "brooding",
    "anxious", "serene", "provocative", "empowering", "theatrical", "volatile",
    "witty", "humorous", "brash", "amiable good natured", "laid back mellow",
    "detached", "visceral", "outraged",
}


def _parse_tags(tag_string: str) -> list[str]:
    """Parse numpy array string like \"['cathartic' 'punk']\" into list."""
    if not tag_string:
        return []
    return re.findall(r"'([^']+)'", tag_string)


def _classify_tags(tokens: list[str]) -> tuple[str, str, str]:
    """Return (genre, mood_str, themes_str) from tag token list."""
    genres, moods, themes = [], [], []
    for tok in tokens:
        tok_lower = tok.lower()
        if any(g in tok_lower for g in GENRE_TOKENS):
            genres.append(tok)
        elif tok_lower in MOOD_TOKENS:
            moods.append(tok)
        else:
            themes.append(tok)
    genre = genres[0].lower() if genres else None
    return genre, " ".join(moods), " ".join(themes)


def _vocal_type_from_tags(tags_str: str) -> str:
    t = tags_str.lower()
    if "female vocal" in t:
        return "female vocals"
    if "male vocal" in t:
        return "male vocals"
    if "instrumental" in t:
        return "instrumental"
    return "unknown"


def _energy_from_loudness(loudness: float | None) -> float | None:
    if loudness is None:
        return None
    return round(max(0.0, min(1.0, (loudness + 25) / 25)), 4)


def _build_lp_msd_text(row: pd.Series) -> str:
    """
    Pack everything a user might search for into one string:
    caption_summary, caption_writing, all tags, key, mode, BPM, artist.
    """
    parts = []
    if row.get("caption_summary"):
        parts.append(str(row["caption_summary"]))
    if row.get("caption_writing"):
        parts.append(str(row["caption_writing"]))
    if row.get("tags"):
        parts.append(str(row["tags"]))  # already space-joined tokens
    if row.get("key") and row.get("mode"):
        parts.append(f"{row['key']} {row['mode']}")
    if row.get("bpm"):
        parts.append(f"{int(row['bpm'])} BPM")
    if row.get("artist"):
        parts.append(str(row["artist"]))
    return " ".join(p for p in parts if p)


def _fma_echonest_descriptors(row: pd.Series) -> list[str]:
    """Derive human-readable descriptor words from echonest floats."""
    words = []
    if pd.notna(row.get("energy")):
        if row["energy"] > 0.7:
            words.append("high energy")
        elif row["energy"] < 0.3:
            words.append("low energy")
    if pd.notna(row.get("acousticness")) and row["acousticness"] > 0.6:
        words.append("acoustic")
    if pd.notna(row.get("instrumentalness")) and row["instrumentalness"] > 0.8:
        words.append("instrumental")
    if pd.notna(row.get("danceability")) and row["danceability"] > 0.7:
        words.append("danceable")
    if pd.notna(row.get("valence")):
        if row["valence"] > 0.6:
            words.append("upbeat happy")
        elif row["valence"] < 0.3:
            words.append("melancholic dark")
    return words


def _build_fma_text(row: pd.Series) -> str:
    parts = []
    if row.get("title"):
        parts.append(str(row["title"]))
    if row.get("genre"):
        parts.append(str(row["genre"]))
    if row.get("genres_all"):
        parts.append(str(row["genres_all"]))
    if row.get("vocal_type"):
        parts.append(str(row["vocal_type"]))
    descriptors = _fma_echonest_descriptors(row)
    parts.extend(descriptors)
    if row.get("bpm"):
        parts.append(f"{int(row['bpm'])} BPM")
    if row.get("mood"):
        parts.append(str(row["mood"]))
    return " ".join(p for p in parts if p)


def _mood_from_valence(valence) -> str | None:
    if valence is None or pd.isna(valence):
        return None
    if valence > 0.6:
        return "upbeat"
    if valence < 0.3:
        return "melancholic"
    return "neutral"


def _vocal_type_from_instrumentalness(instrumentalness) -> str | None:
    if instrumentalness is None or pd.isna(instrumentalness):
        return None
    return "instrumental" if instrumentalness > 0.8 else "unknown"


def _clean(val):
    """Return None for any NaN/NaT/None, otherwise the value."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    return val


# ---------------------------------------------------------------------------
# lp_msd ingestion
# ---------------------------------------------------------------------------
def ingest_lp_msd(engine) -> pd.DataFrame:
    log.info("Reading lp_musiccaps_msd_v ...")
    df = pd.read_sql(
        text("""
            SELECT
                track_id, title, artist_name, year,
                tag, caption_summary, caption_writing,
                tempo, key, mode, loudness, artist_familiarity
            FROM lp_musiccaps_msd_v
        """),
        engine.connect(),
    )
    log.info("  Read %d rows", len(df))

    records = []
    for _, row in df.iterrows():
        tokens = _parse_tags(row["tag"] or "")
        tags_str = " ".join(tokens)
        genre, mood, themes = _classify_tags(tokens)
        vocal_type = _vocal_type_from_tags(tags_str)
        bpm = int(round(row["tempo"])) if row["tempo"] and row["tempo"] > 0 else None
        energy = _energy_from_loudness(row["loudness"])
        year = int(row["year"]) if row["year"] and row["year"] != 0 else None

        rec = {
            "id": f"msd_{row['track_id']}",
            "source": "lp_msd",
            "title": _clean(row["title"]),
            "artist": _clean(row["artist_name"]),
            "year": year,
            "bpm": bpm,
            "key": row["key"] or None,
            "mode": row["mode"] or None,
            "mode_key": f"{row['key']} {row['mode']}" if row["key"] and row["mode"] else None,
            "energy": energy,
            "genre": genre,
            "mood": mood or None,
            "themes": themes or None,
            "vocal_type": vocal_type,
            "artist_familiarity": round(float(row["artist_familiarity"]), 4) if pd.notna(row["artist_familiarity"]) else None,
            "caption_summary": row["caption_summary"] or None,
            "tags": tags_str or None,
        }
        # Build text last — needs the derived fields above
        rec["text"] = _build_lp_msd_text({
            "caption_summary": rec["caption_summary"],
            "caption_writing": row["caption_writing"],
            "tags": rec["tags"],
            "key": rec["key"],
            "mode": rec["mode"],
            "bpm": rec["bpm"],
            "artist": rec["artist"],
        })
        records.append(rec)

    result = pd.DataFrame(records)
    log.info("  Built %d lp_msd blueprint records", len(result))
    return result


# ---------------------------------------------------------------------------
# fma ingestion
# ---------------------------------------------------------------------------
def ingest_fma(engine) -> pd.DataFrame:
    log.info("Reading fma_all_v ...")
    df = pd.read_sql(
        text("""
            SELECT
                track_id, title, genre_top, genres_all_names,
                acousticness, danceability, energy, instrumentalness,
                speechiness, tempo, valence
            FROM fma_all_v
        """),
        engine.connect(),
    )
    log.info("  Read %d rows", len(df))

    records = []
    for _, row in df.iterrows():
        bpm = int(round(row["tempo"])) if pd.notna(row["tempo"]) and row["tempo"] > 0 else None
        mood = _mood_from_valence(row["valence"] if pd.notna(row["valence"]) else None)
        vocal_type = _vocal_type_from_instrumentalness(row["instrumentalness"] if pd.notna(row["instrumentalness"]) else None)

        genre = _clean(row["genre_top"])
        genres_all = _clean(row["genres_all_names"])

        rec = {
            "id": f"fma_{row['track_id']}",
            "source": "fma",
            "title": _clean(row["title"]),
            "genre": genre,
            "genres_all": genres_all,
            "bpm": bpm,
            "energy": round(float(row["energy"]), 4) if pd.notna(row["energy"]) else None,
            "acousticness": round(float(row["acousticness"]), 4) if pd.notna(row["acousticness"]) else None,
            "valence": round(float(row["valence"]), 4) if pd.notna(row["valence"]) else None,
            "danceability": round(float(row["danceability"]), 4) if pd.notna(row["danceability"]) else None,
            "instrumentalness": round(float(row["instrumentalness"]), 4) if pd.notna(row["instrumentalness"]) else None,
            "vocal_type": vocal_type,
            "mood": mood,
        }
        rec["text"] = _build_fma_text(rec)
        records.append(rec)

    result = pd.DataFrame(records)
    log.info("  Built %d fma blueprint records", len(result))
    return result


# ---------------------------------------------------------------------------
# Spot check
# ---------------------------------------------------------------------------
def spot_check(df: pd.DataFrame, label: str, n: int = 3) -> None:
    log.info("--- Spot check: %s (%d records) ---", label, len(df))
    for _, row in df.sample(n=min(n, len(df)), random_state=42).iterrows():
        log.info("  id=%s  genre=%s  bpm=%s  vocal_type=%s",
                 row["id"], row.get("genre"), row.get("bpm"), row.get("vocal_type"))
        log.info("  text=%s", str(row["text"])[:120])


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    engine = create_engine(PG_URL)

    lp_df = ingest_lp_msd(engine)
    spot_check(lp_df, "lp_msd")
    out_lp = DATA_DIR / "blueprints_lp_msd.parquet"
    lp_df.to_parquet(out_lp, index=False)
    log.info("Saved %s (%d rows)", out_lp, len(lp_df))

    fma_df = ingest_fma(engine)
    spot_check(fma_df, "fma")
    out_fma = DATA_DIR / "blueprints_fma.parquet"
    fma_df.to_parquet(out_fma, index=False)
    log.info("Saved %s (%d rows)", out_fma, len(fma_df))

    log.info("Done. Total blueprints: %d", len(lp_df) + len(fma_df))


if __name__ == "__main__":
    main()
