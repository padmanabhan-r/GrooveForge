import logging
from collections import Counter

import turbopuffer

from app.config import settings
from app.models import AggregatedTraits, Blueprint, SearchRequest

logger = logging.getLogger(__name__)

NAMESPACE = "music_blueprints"


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
        source_dataset=attrs.get("source_dataset", ""),
        artist=attrs.get("artist", ""),
        genre=attrs.get("genre", "unknown"),
        subgenre=attrs.get("subgenre", ""),
        bpm=float(attrs.get("bpm", 120)),
        key=attrs.get("key", "C"),
        mode=attrs.get("mode", "major"),
        energy=float(attrs.get("energy", 0.5)),
        acousticness=float(attrs.get("acousticness", 0.0)),
        instrumentation=attrs.get("instrumentation", []),
        themes=attrs.get("themes", []),
        vocal_type=attrs.get("vocal_type", ""),
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
            instrumentation=[],
            energy=0.5,
            vocal_type="",
        )

    avg_bpm = round(sum(b.bpm for b in blueprints) / len(blueprints), 1)

    key_counter = Counter(f"{b.key} {b.mode}" for b in blueprints)
    mode_key = key_counter.most_common(1)[0][0]

    genre_counter = Counter(b.genre for b in blueprints)
    genre_cluster = genre_counter.most_common(1)[0][0]

    theme_counter: Counter = Counter()
    for b in blueprints:
        theme_counter.update(b.themes)
    mood_cluster = theme_counter.most_common(1)[0][0] if theme_counter else "unknown"

    seen: set[str] = set()
    instrumentation: list[str] = []
    for b in blueprints:
        for inst in b.instrumentation:
            if inst not in seen:
                seen.add(inst)
                instrumentation.append(inst)

    avg_energy = round(sum(b.energy for b in blueprints) / len(blueprints), 2)

    vocal_counter = Counter(b.vocal_type for b in blueprints if b.vocal_type)
    vocal_type = vocal_counter.most_common(1)[0][0] if vocal_counter else ""

    return AggregatedTraits(
        avg_bpm=avg_bpm,
        mode_key=mode_key,
        genre_cluster=genre_cluster,
        mood_cluster=mood_cluster,
        instrumentation=instrumentation[:8],
        energy=avg_energy,
        vocal_type=vocal_type,
    )


async def search_blueprints(request: SearchRequest) -> list[Blueprint]:
    query_text = _build_query_text(request)
    logger.info("Turbopuffer query: %r top_k=%d", query_text, request.top_k)

    client = _get_client()
    ns = client.namespace(NAMESPACE)

    filters: list = []
    if request.bpm_lower is not None:
        filters.append(["bpm", "Gte", int(request.bpm_lower)])
    if request.bpm_upper is not None:
        filters.append(["bpm", "Lte", int(request.bpm_upper)])
    if request.vocal_type:
        filters.append(["vocal_type", "Eq", request.vocal_type])

    query_kwargs: dict = {
        "rank_by": ["BM25", "text", query_text],
        "top_k": request.top_k,
        "include_attributes": True,
    }
    if filters:
        query_kwargs["filters"] = ["And", filters] if len(filters) > 1 else filters[0]

    response = await ns.query(**query_kwargs)
    rows = response.rows or []

    return [_row_to_blueprint(row) for row in rows]


async def search_by_artist(artist: str, top_k: int = 8) -> list[Blueprint]:
    client = _get_client()
    ns = client.namespace(NAMESPACE)

    response = await ns.query(
        rank_by=["BM25", "text", artist],
        filters=["artist", "Eq", artist],
        top_k=top_k,
        include_attributes=True,
    )
    rows = response.rows or []
    return [_row_to_blueprint(row) for row in rows]
