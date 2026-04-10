import logging

from fastapi import APIRouter, HTTPException

from app.generation import generate_from_composition_plan, generate_from_prompt
from app.models import GenerateRequest, GenerateResponse, SearchRequest
from app.retrieval import aggregate_blueprints, search_blueprints
from app.synthesis import build_composition_plan, build_prompt, enrich_prompt

logger = logging.getLogger(__name__)
router = APIRouter()


async def _resolve_blueprints(request: GenerateRequest):
    """Return (blueprints, aggregated) — retrieve if needed, else use provided."""
    if request.blueprints:
        blueprints = request.blueprints
        return blueprints, aggregate_blueprints(blueprints)

    search_req = SearchRequest(
        vibes=request.vibes,
        bpm_lower=request.bpm_lower,
        bpm_upper=request.bpm_upper,
    )
    blueprints = await search_blueprints(search_req)
    if not blueprints:
        raise HTTPException(status_code=404, detail="No blueprints found for the given query.")
    return blueprints, aggregate_blueprints(blueprints)


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest) -> GenerateResponse:
    blueprints, aggregated = await _resolve_blueprints(request)

    if request.mode == "composition_plan":
        plan = build_composition_plan(aggregated, request.lyrics or "")
        audio_url, prompt_used = await generate_from_composition_plan(plan, aggregated)
    else:
        base_prompt = build_prompt(aggregated)
        final_prompt = await enrich_prompt(base_prompt, aggregated)
        audio_url, prompt_used = await generate_from_prompt(final_prompt)

    logger.info("Generated track: %s (mode=%s)", audio_url, request.mode)
    return GenerateResponse(
        audio_url=audio_url,
        prompt_used=prompt_used,
        blueprints=blueprints,
        aggregated=aggregated,
    )
