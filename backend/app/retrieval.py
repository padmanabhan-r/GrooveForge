import asyncio
import logging
from collections import Counter

import turbopuffer
from openai import AsyncOpenAI

from app.config import settings
from app.models import AggregatedTraits, Blueprint, SearchRequest

logger = logging.getLogger(__name__)

_EMBED_MODEL = "sentence-transformers/all-minilm-l6-v2"

# RRF constant — standard default; higher k reduces impact of top ranks
_RRF_K = 60

# Only the "text" attribute was indexed with full_text_search: True at ingest time

_oai_client: AsyncOpenAI | None = None


def init_oai_client() -> None:
    global _oai_client
    _oai_client = AsyncOpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "https://groove-forge.vercel.app",
            "X-OpenRouter-Title": "GrooveForge",
        },
    )


async def close_oai_client() -> None:
    global _oai_client
    if _oai_client is not None:
        await _oai_client.close()
        _oai_client = None


async def _embed(text: str) -> list[float]:
    assert _oai_client is not None, "OpenAI client not initialised"
    response = await _oai_client.embeddings.create(
        model=_EMBED_MODEL,
        input=text,
        encoding_format="float",
    )
    return response.data[0].embedding


_tpuf_client: turbopuffer.AsyncTurbopuffer | None = None


def get_tpuf_client() -> turbopuffer.AsyncTurbopuffer:
    """Return the shared AsyncTurbopuffer client (initialised at startup)."""
    if _tpuf_client is None:
        raise RuntimeError("Turbopuffer client not initialised — call init_tpuf_client() first")
    return _tpuf_client


def init_tpuf_client() -> turbopuffer.AsyncTurbopuffer:
    global _tpuf_client
    _tpuf_client = turbopuffer.AsyncTurbopuffer(
        api_key=settings.turbopuffer_api_key,
        region=settings.turbopuffer_region,
    )
    return _tpuf_client


async def close_tpuf_client() -> None:
    global _tpuf_client
    if _tpuf_client is not None:
        try:
            await _tpuf_client.close()
        except Exception:
            pass
        _tpuf_client = None


def _build_query_text(request: SearchRequest) -> str:
    parts = list(request.vibes)
    if request.free_text:
        parts.append(request.free_text)
    if request.key:
        parts.append(request.key)
    if request.vocal_type:
        parts.append(request.vocal_type)
    if request.bpm_lower and request.bpm_upper:
        parts.append(f"{int(request.bpm_lower)}-{int(request.bpm_upper)} BPM")
    return " ".join(parts) if parts else "music"


def _row_to_blueprint(row, score: float = 0.0) -> Blueprint:
    attrs: dict = row.model_extra or {}
    return Blueprint(
        id=str(row.id),
        source=attrs.get("source", ""),
        title=attrs.get("title", ""),
        artist=attrs.get("artist", ""),
        genre=attrs.get("genre") or "unknown",
        genres_all=attrs.get("genres_all", ""),
        bpm=float(attrs.get("bpm") or 120.0),
        key=attrs.get("key", ""),
        mode=attrs.get("mode", ""),
        energy=float(attrs.get("energy") or 0.5),
        acousticness=float(attrs.get("acousticness") or 0.0),
        valence=float(attrs.get("valence") or 0.5),
        danceability=float(attrs.get("danceability") or 0.5),
        instrumentalness=float(attrs.get("instrumentalness") or 0.0),
        liveness=float(attrs.get("liveness") or 0.0),
        speechiness=float(attrs.get("speechiness") or 0.0),
        loudness=float(attrs.get("loudness") or 0.0),
        vocal_type=attrs.get("vocal_type", ""),
        mood=attrs.get("mood", ""),
        themes=attrs.get("themes", ""),
        tags=attrs.get("tags", ""),
        caption_summary=attrs.get("caption_summary", ""),
        text_description=attrs.get("text", ""),
        similarity_score=round(score, 4),
    )


def _rrf_merge(result_lists: list[list[Blueprint]], k: int = _RRF_K) -> list[Blueprint]:
    """Reciprocal Rank Fusion across multiple ranked result lists."""
    scores: dict[str, float] = {}
    best: dict[str, Blueprint] = {}

    for ranked in result_lists:
        for rank, bp in enumerate(ranked):
            scores[bp.id] = scores.get(bp.id, 0.0) + 1.0 / (k + rank + 1)
            # Keep whichever blueprint instance we see first (they're identical)
            if bp.id not in best:
                best[bp.id] = bp

    sorted_ids = sorted(scores, key=scores.__getitem__, reverse=True)
    merged = []
    for bid in sorted_ids:
        bp = best[bid]
        # Attach RRF score as similarity_score for frontend display
        bp.similarity_score = round(scores[bid], 4)
        merged.append(bp)
    return merged


async def _hybrid_query_namespace(
    client: turbopuffer.AsyncTurbopuffer,
    namespace: str,
    query_text: str,
    query_vector: list[float],
    top_k: int,
    filters: list,
) -> tuple[list[Blueprint], list[Blueprint]]:
    """Run ANN + weighted BM25 as a single multi_query against one namespace.

    Returns (ann_results, bm25_results) for downstream RRF merging.
    """
    ns = client.namespace(namespace)

    ann_query: dict = {
        "rank_by": ("vector", "ANN", query_vector),
        "top_k": top_k,
        "include_attributes": True,
        "consistency": {"level": "eventual"},
    }
    bm25_query: dict = {
        "rank_by": ("text", "BM25", query_text),
        "top_k": top_k,
        "include_attributes": True,
        "consistency": {"level": "eventual"},
    }

    if filters:
        filter_expr = ["And", filters] if len(filters) > 1 else filters[0]
        ann_query["filters"] = filter_expr
        bm25_query["filters"] = filter_expr

    try:
        response = await ns.multi_query(queries=[ann_query, bm25_query])
        results = response.results or [None, None]
        ann_rows = results[0].rows if results[0] else []
        bm25_rows = results[1].rows if results[1] else []
        ann_blueprints = [_row_to_blueprint(r) for r in (ann_rows or [])]
        bm25_blueprints = [_row_to_blueprint(r) for r in (bm25_rows or [])]
        return ann_blueprints, bm25_blueprints
    except Exception:
        logger.exception("Turbopuffer hybrid query failed for namespace %s", namespace)
        return [], []


def aggregate_blueprints(blueprints: list[Blueprint]) -> AggregatedTraits:
    if not blueprints:
        return AggregatedTraits(
            avg_bpm=120.0,
            mode_key="C major",
            genre_cluster="unknown",
            mood_cluster="unknown",
            energy=0.5,
            vocal_type="",
        )

    avg_bpm = round(sum(b.bpm for b in blueprints) / len(blueprints), 1)

    key_counter = Counter(
        f"{b.key} {b.mode}" for b in blueprints if b.key and b.mode
    )
    mode_key = key_counter.most_common(1)[0][0] if key_counter else "unknown"

    genre_counter = Counter(b.genre for b in blueprints if b.genre)
    genre_cluster = genre_counter.most_common(1)[0][0] if genre_counter else "unknown"

    mood_counter: Counter = Counter()
    for b in blueprints:
        for token in b.mood.split():
            mood_counter[token] += 1
    mood_cluster = mood_counter.most_common(1)[0][0] if mood_counter else "unknown"

    avg_energy = round(sum(b.energy for b in blueprints) / len(blueprints), 2)

    vocal_counter = Counter(
        b.vocal_type for b in blueprints
        if b.vocal_type and b.vocal_type.lower() not in ("unknown", "n/a", "none")
    )
    vocal_type = vocal_counter.most_common(1)[0][0] if vocal_counter else ""

    return AggregatedTraits(
        avg_bpm=avg_bpm,
        mode_key=mode_key,
        genre_cluster=genre_cluster,
        mood_cluster=mood_cluster,
        energy=avg_energy,
        vocal_type=vocal_type,
    )


async def search_blueprints(request: SearchRequest) -> list[Blueprint]:
    query_text = _build_query_text(request)
    logger.info(
        "Hybrid query: %r top_k=%d namespaces=[%s, %s]",
        query_text,
        request.top_k,
        settings.active_ns_lp,
        settings.active_ns_fma,
    )

    # Embed once; reused across both namespaces
    query_vector = await _embed(query_text)

    filters: list = []
    if request.bpm_lower is not None:
        filters.append(["bpm", "Gte", float(request.bpm_lower)])
    if request.bpm_upper is not None:
        filters.append(["bpm", "Lte", float(request.bpm_upper)])
    if request.vocal_type:
        filters.append(["vocal_type", "Eq", request.vocal_type])

    client = get_tpuf_client()
    (lp_ann, lp_bm25), (fma_ann, fma_bm25) = await asyncio.gather(
        _hybrid_query_namespace(
            client, settings.active_ns_lp, query_text, query_vector, request.top_k, filters
        ),
        _hybrid_query_namespace(
            client, settings.active_ns_fma, query_text, query_vector, request.top_k, filters
        ),
    )

    # RRF across all four ranked lists
    merged = _rrf_merge([lp_ann, lp_bm25, fma_ann, fma_bm25])
    return merged[: request.top_k]


async def search_by_artist(artist: str, top_k: int = 8) -> list[Blueprint]:
    query_vector = await _embed(artist)
    client = get_tpuf_client()
    (lp_ann, lp_bm25), (fma_ann, fma_bm25) = await asyncio.gather(
        _hybrid_query_namespace(client, settings.active_ns_lp, artist, query_vector, top_k, []),
        _hybrid_query_namespace(client, settings.active_ns_fma, artist, query_vector, top_k, []),
    )
    merged = _rrf_merge([lp_ann, lp_bm25, fma_ann, fma_bm25])
    return merged[:top_k]


async def warm_cache() -> None:
    """Pre-flight query to warm both namespace caches on server startup."""
    try:
        client = get_tpuf_client()
        warm_vec = [0.0] * 384
        await asyncio.gather(
            client.namespace(settings.active_ns_lp).query(
                rank_by=("vector", "ANN", warm_vec),
                top_k=1,
                consistency={"level": "eventual"},
            ),
            client.namespace(settings.active_ns_fma).query(
                rank_by=("vector", "ANN", warm_vec),
                top_k=1,
                consistency={"level": "eventual"},
            ),
        )
        logger.info("Turbopuffer namespace caches warmed")
    except Exception:
        logger.warning("Cache warm-up failed (non-fatal)", exc_info=True)
