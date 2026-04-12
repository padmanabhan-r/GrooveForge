import logging

from fastapi import APIRouter, HTTPException

from app.models import LyricsAnalysisRequest, LyricsSearchResponse, SearchRequest
from app.retrieval import aggregate_blueprints, search_blueprints
from app.synthesis import analyze_lyrics

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/analyze-lyrics", response_model=LyricsSearchResponse)
async def analyze_lyrics_endpoint(request: LyricsAnalysisRequest) -> LyricsSearchResponse:
    """Analyze lyrics with Gemini, then retrieve matching blueprints from Turbopuffer."""
    if not request.lyrics.strip():
        raise HTTPException(status_code=422, detail="Lyrics cannot be empty.")

    analysis = await analyze_lyrics(request.lyrics)
    logger.info("Lyrics analysis: mood=%s genres=%s query=%r", analysis.mood, analysis.suggested_genres, analysis.search_query)

    search_req = SearchRequest(
        free_text=analysis.search_query,
        vibes=analysis.mood + analysis.suggested_genres,
        top_k=8,
    )
    blueprints = await search_blueprints(search_req)

    if not blueprints:
        raise HTTPException(status_code=404, detail="No matching blueprints found for these lyrics.")

    aggregated = aggregate_blueprints(blueprints)
    logger.info("Lyrics search returned %d blueprints", len(blueprints))
    return LyricsSearchResponse(analysis=analysis, blueprints=blueprints, aggregated=aggregated)
