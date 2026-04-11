"""
Embed blueprint parquets and upsert into Turbopuffer namespaces.

Reads:
  data/blueprints_lp_msd.parquet
  data/blueprints_fma.parquet

Writes to Turbopuffer:
  lp_msd_minilm  (384-dim, MiniLM)
  fma_minilm     (384-dim, MiniLM)

Checkpoints progress so a killed run can resume from where it left off.

Usage:
  cd /Users/paddy/Documents/Github/ElevenHacks/Week4_Project
  uv run python backend/scripts/embed_blueprints.py
  uv run python backend/scripts/embed_blueprints.py --namespace lp_msd_minilm  # one only
  uv run python backend/scripts/embed_blueprints.py --resume                    # skip done batches
"""

import argparse
import json
import logging
import os
from pathlib import Path

import numpy as np
import pandas as pd
import turbopuffer
from sentence_transformers import SentenceTransformer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
CHECKPOINT_DIR = DATA_DIR / ".embed_checkpoints"

EMBED_BATCH = 256   # rows per SentenceTransformer encode call
UPSERT_BATCH = 500  # rows per Turbopuffer write call

NAMESPACE_MAP = {
    "lp_msd_minilm": DATA_DIR / "blueprints_lp_msd.parquet",
    "fma_minilm":    DATA_DIR / "blueprints_fma.parquet",
}

# Attributes declared as filterable in Turbopuffer schema
FILTERABLE = {"source", "genre", "mood", "vocal_type", "key", "mode", "mode_key"}
FILTERABLE_NUMERIC = {"bpm", "year", "energy", "acousticness", "valence",
                      "danceability", "instrumentalness", "artist_familiarity"}


def _schema() -> dict:
    """Turbopuffer attribute schema — defines BM25 index and filterable attributes."""
    schema: dict = {
        "text": {"type": "string", "full_text_search": True},
    }
    for attr in FILTERABLE:
        schema[attr] = {"type": "string", "filterable": True}
    for attr in FILTERABLE_NUMERIC:
        schema[attr] = {"type": "float", "filterable": True}
    return schema


def _checkpoint_path(namespace: str) -> Path:
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    return CHECKPOINT_DIR / f"{namespace}.json"


def _load_checkpoint(namespace: str) -> int:
    """Return the next offset to process (0 if no checkpoint)."""
    path = _checkpoint_path(namespace)
    if path.exists():
        data = json.loads(path.read_text())
        offset = data.get("next_offset", 0)
        log.info("Checkpoint found for %s — resuming from offset %d", namespace, offset)
        return offset
    return 0


def _save_checkpoint(namespace: str, next_offset: int) -> None:
    _checkpoint_path(namespace).write_text(json.dumps({"next_offset": next_offset}))


def _row_to_tpuf(row: pd.Series, vector: list[float]) -> dict:
    """Build a Turbopuffer row dict, dropping None/NaN values."""
    doc: dict = {"id": row["id"], "vector": vector}
    for col in row.index:
        if col in ("id",):
            continue
        val = row[col]
        # Drop nulls — Turbopuffer treats missing key as null anyway
        if val is None:
            continue
        try:
            if pd.isna(val):
                continue
        except (TypeError, ValueError):
            pass
        # Cast numpy types to Python natives
        if isinstance(val, (np.integer,)):
            val = int(val)
        elif isinstance(val, (np.floating,)):
            val = float(val)
        doc[col] = val
    return doc


def embed_and_upsert(namespace: str, parquet_path: Path, model: SentenceTransformer,
                     client: turbopuffer.Turbopuffer, resume: bool) -> None:
    log.info("=== %s ===", namespace)
    df = pd.read_parquet(parquet_path)
    total = len(df)
    log.info("  Loaded %d records from %s", total, parquet_path.name)

    start_offset = _load_checkpoint(namespace) if resume else 0
    if start_offset >= total:
        log.info("  Already complete — skipping")
        return

    schema = _schema()
    upserted = 0

    for batch_start in range(start_offset, total, UPSERT_BATCH):
        batch_df = df.iloc[batch_start: batch_start + UPSERT_BATCH]

        # Embed in sub-batches
        texts = batch_df["text"].tolist()
        vectors = model.encode(
            texts,
            batch_size=EMBED_BATCH,
            show_progress_bar=False,
            normalize_embeddings=True,
        ).tolist()

        rows = [
            _row_to_tpuf(batch_df.iloc[i], vectors[i])
            for i in range(len(batch_df))
        ]

        client.namespace(namespace).write(
            distance_metric="cosine_distance",
            schema=schema,
            upsert_rows=rows,
            disable_backpressure=True,
        )

        upserted += len(rows)
        _save_checkpoint(namespace, batch_start + UPSERT_BATCH)
        log.info("  %s — %d / %d upserted", namespace, upserted, total - start_offset)

    log.info("  Done: %s — %d records upserted", namespace, upserted)
    # Clear checkpoint on clean finish
    _checkpoint_path(namespace).unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--namespace",
        choices=list(NAMESPACE_MAP.keys()),
        help="Process only this namespace (default: both)",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint instead of starting over",
    )
    args = parser.parse_args()

    api_key = os.environ.get("TURBOPUFFER_API_KEY") or _read_env_file()
    if not api_key:
        raise RuntimeError("TURBOPUFFER_API_KEY not set")

    log.info("Loading sentence-transformers/all-MiniLM-L6-v2 ...")
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    log.info("  Model loaded — embedding dim: %d", model.get_sentence_embedding_dimension())

    client = turbopuffer.Turbopuffer(api_key=api_key, region="aws-us-east-1")

    namespaces = (
        {args.namespace: NAMESPACE_MAP[args.namespace]}
        if args.namespace
        else NAMESPACE_MAP
    )

    for ns, path in namespaces.items():
        embed_and_upsert(ns, path, model, client, resume=args.resume)

    log.info("All done.")


def _read_env_file() -> str:
    """Read TURBOPUFFER_API_KEY from backend/.env if present."""
    env_path = ROOT / "backend" / ".env"
    if not env_path.exists():
        return ""
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line.startswith("TURBOPUFFER_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


if __name__ == "__main__":
    main()
