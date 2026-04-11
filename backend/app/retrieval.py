import asyncio
import logging
from collections import Counter

import turbopuffer

from app.config import settings
from app.models import AggregatedTraits, Blueprint, SearchRequest

logger = logging.getLogger(__name__)


def _get_client() -> turbopuffer.AsyncTurbopuffer:
    return turbopuffer.AsyncTurbopuffer(
        api_key=settings.turbopuffer_api_key,
        region=settings.turbopuffer_region,
    )


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
        vocal_type=attrs.get("vocal_type", ""),
        mood=attrs.get("mood", ""),
        themes=attrs.get("themes", ""),
        tags=attrs.get("tags", ""),
        caption_summary=attrs.get("caption_summary", ""),
        text_description=attrs.get("text", ""),
        similarity_score=round(score, 4),
    )


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

    vocal_counter = Counter(b.vocal_type for b in blueprints if b.vocal_type)
    vocal_type = vocal_counter.most_common(1)[0][0] if vocal_counter else ""

    return AggregatedTraits(
        avg_bpm=avg_bpm,
        mode_key=mode_key,
        genre_cluster=genre_cluster,
        mood_cluster=mood_cluster,
        energy=avg_energy,
        vocal_type=vocal_type,
    )


async def _query_namespace(
    client: turbopuffer.AsyncTurbopuffer,
    namespace: str,
    query_text: str,
    top_k: int,
    filters: list,
) -> list[Blueprint]:
    ns = client.namespace(namespace)
    query_kwargs: dict = {
        "rank_by": ["BM25", "text", query_text],
        "top_k": top_k,
        "include_attributes": True,
    }
    if filters:
        query_kwargs["filters"] = ["And", filters] if len(filters) > 1 else filters[0]
    try:
        response = await ns.query(**query_kwargs)
        return [_row_to_blueprint(row) for row in (response.rows or [])]
    except Exception:
        logger.exception("Turbopuffer query failed for namespace %s", namespace)
        return []


async def search_blueprints(request: SearchRequest) -> list[Blueprint]:
    query_text = _build_query_text(request)
    logger.info(
        "Turbopuffer query: %r top_k=%d namespaces=[%s, %s]",
        query_text,
        request.top_k,
        settings.active_ns_lp,
        settings.active_ns_fma,
    )

    filters: list = []
    if request.bpm_lower is not None:
        filters.append(["bpm", "Gte", float(request.bpm_lower)])
    if request.bpm_upper is not None:
        filters.append(["bpm", "Lte", float(request.bpm_upper)])
    if request.vocal_type:
        filters.append(["vocal_type", "Eq", request.vocal_type])

    client = _get_client()
    lp_results, fma_results = await asyncio.gather(
        _query_namespace(client, settings.active_ns_lp, query_text, request.top_k, filters),
        _query_namespace(client, settings.active_ns_fma, query_text, request.top_k, filters),
    )

    # Merge, deduplicate by id, sort by similarity (higher BM25 rank = lower dist)
    seen: set[str] = set()
    merged: list[Blueprint] = []
    for bp in lp_results + fma_results:
        if bp.id not in seen:
            seen.add(bp.id)
            merged.append(bp)

    return merged[: request.top_k]


async def search_by_artist(artist: str, top_k: int = 8) -> list[Blueprint]:
    client = _get_client()
    lp_results, fma_results = await asyncio.gather(
        _query_namespace(client, settings.active_ns_lp, artist, top_k, []),
        _query_namespace(client, settings.active_ns_fma, artist, top_k, []),
    )

    seen: set[str] = set()
    merged: list[Blueprint] = []
    for bp in lp_results + fma_results:
        if bp.id not in seen:
            seen.add(bp.id)
            merged.append(bp)

    return merged[:top_k]
