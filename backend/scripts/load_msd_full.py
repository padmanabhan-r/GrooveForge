"""
Load full MSD metadata + audio features into PostgreSQL.

Sources:
  data/MSD Metadata/track_metadata.db   — 1M tracks, basic metadata (SQLite)
  data/MSD Metadata/msd_summary_file.h5 — 1M tracks, audio features (HDF5)

Target:
  PostgreSQL table `msd_songs` in GrooveForge database
  (replaces the 10K subset loaded previously)

Usage:
  cd /Users/paddy/Documents/Github/ElevenHacks/Week4_Project
  uv run python backend/scripts/load_msd_full.py
"""

import sqlite3
import logging
import os
from pathlib import Path

import h5py
import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "MSD Metadata"
SQLITE_PATH = DATA_DIR / "track_metadata.db"
HDF5_PATH = DATA_DIR / "msd_summary_file.h5"

# ---------------------------------------------------------------------------
# PostgreSQL connection
# ---------------------------------------------------------------------------
def _pg_url() -> str:
    if url := os.environ.get("POSTGRES_URL"):
        return url
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("POSTGRES_URL="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("POSTGRES_URL not set")

PG_URL = _pg_url()

# ---------------------------------------------------------------------------
# Key / mode decode tables
# ---------------------------------------------------------------------------
KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MODE_NAMES = {0: "minor", 1: "major"}


def load_sqlite_metadata() -> pd.DataFrame:
    """Read all rows from track_metadata.db songs table."""
    log.info("Reading SQLite track_metadata.db ...")
    conn = sqlite3.connect(SQLITE_PATH)
    df = pd.read_sql(
        """
        SELECT
            track_id,
            title,
            artist_name,
            release,
            year,
            duration,
            artist_familiarity,
            artist_hotttnesss AS artist_hotness
        FROM songs
        """,
        conn,
    )
    conn.close()
    log.info("  SQLite: %d rows", len(df))
    return df


def load_hdf5_analysis() -> pd.DataFrame:
    """Read scalar audio features from msd_summary_file.h5 analysis group."""
    log.info("Reading HDF5 msd_summary_file.h5 analysis group ...")
    with h5py.File(HDF5_PATH, "r") as f:
        songs = f["analysis"]["songs"]
        track_ids = songs["track_id"][:]          # bytes array
        tempo = songs["tempo"][:]
        key_int = songs["key"][:]
        key_confidence = songs["key_confidence"][:]
        mode_int = songs["mode"][:]
        mode_confidence = songs["mode_confidence"][:]
        loudness = songs["loudness"][:]

    df = pd.DataFrame(
        {
            "track_id": [t.decode("utf-8") for t in track_ids],
            "tempo": tempo.astype(float),
            "key_int": key_int.astype(int),
            "key": [KEY_NAMES[k % 12] for k in key_int],
            "key_confidence": key_confidence.astype(float),
            "mode_int": mode_int.astype(int),
            "mode": [MODE_NAMES.get(int(m), "unknown") for m in mode_int],
            "mode_confidence": mode_confidence.astype(float),
            "loudness": loudness.astype(float),
        }
    )
    log.info("  HDF5: %d rows", len(df))
    return df


def merge_and_load() -> None:
    meta = load_sqlite_metadata()
    audio = load_hdf5_analysis()

    log.info("Merging on track_id ...")
    df = meta.merge(audio, on="track_id", how="left")
    log.info("  Merged: %d rows", len(df))

    # Reorder columns to match expected schema
    df = df[
        [
            "track_id",
            "title",
            "artist_name",
            "release",
            "year",
            "duration",
            "artist_familiarity",
            "artist_hotness",
            "tempo",
            "key",
            "key_int",
            "key_confidence",
            "mode",
            "mode_int",
            "mode_confidence",
            "loudness",
        ]
    ]

    log.info("Writing to PostgreSQL (table: msd_songs) ...")
    engine = create_engine(PG_URL)

    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS msd_songs"))

    df.to_sql("msd_songs", engine, if_exists="replace", index=False, chunksize=10_000)
    log.info("  Loaded %d rows into msd_songs", len(df))

    # Quick verification
    with engine.connect() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM msd_songs")).scalar()
        sample = conn.execute(
            text("SELECT track_id, tempo, key, mode, loudness FROM msd_songs LIMIT 3")
        ).fetchall()

    log.info("  Verified: %d rows in msd_songs", count)
    for row in sample:
        log.info("  Sample: %s", row)


if __name__ == "__main__":
    merge_and_load()
