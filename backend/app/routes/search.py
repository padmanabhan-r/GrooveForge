import logging

from fastapi import APIRouter, HTTPException

from app.models import SearchRequest, SearchResponse
from app.retrieval import aggregate_blueprints, search_blueprints, search_by_artist

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    if request.artist:
        blueprints = await search_by_artist(request.artist, top_k=request.top_k)
    else:
        blueprints = await search_blueprints(request)

    if not blueprints:
        raise HTTPException(status_code=404, detail="No blueprints found for the given query.")

    aggregated = aggregate_blueprints(blueprints)
    logger.info("Search returned %d blueprints", len(blueprints))
    return SearchResponse(blueprints=blueprints, aggregated=aggregated)
