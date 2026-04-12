import logging

from fastapi import APIRouter, HTTPException

from app.generation import generate_from_composition_plan, generate_from_prompt
from app.models import GenerateRequest, GenerateResponse, PreviewResponse, SearchRequest
from app.retrieval import aggregate_blueprints, search_blueprints
from app.synthesis import synthesize_advanced, synthesize_simple

logger = logging.getLogger(__name__)
router = APIRouter()


async def _resolve_blueprints(request: GenerateRequest):
    """Return (blueprints, aggregated) — use provided blueprints or retrieve fresh."""
    if request.blueprints:
        blueprints = request.blueprints
        return blueprints, aggregate_blueprints(blueprints)

    search_req = SearchRequest(
        vibes=request.vibes,
        free_text=request.free_text,
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

    if request.generation_mode == "advanced":
        plan = await synthesize_advanced(
            user_input=request.user_input,
            blueprints=blueprints,
            music_length_ms=request.music_length_ms,
            lyrics=request.lyrics or "",
        )
        audio_url, prompt_used = await generate_from_composition_plan(plan, aggregated)
    else:
        prompt, _ = await synthesize_simple(
            user_input=request.user_input,
            blueprints=blueprints,
            music_length_ms=request.music_length_ms,
        )
        audio_url, prompt_used = await generate_from_prompt(prompt, request.music_length_ms)

    logger.info(
        "Generated track: %s (generation_mode=%s, length_ms=%d)",
        audio_url,
        request.generation_mode,
        request.music_length_ms,
    )
    return GenerateResponse(
        audio_url=audio_url,
        prompt_used=prompt_used,
        blueprints=blueprints,
        aggregated=aggregated,
    )


@router.post("/preview", response_model=PreviewResponse)
async def preview(request: GenerateRequest) -> PreviewResponse:
    """Synthesize the prompt or composition plan without calling ElevenLabs.

    Used by the frontend Review mode so users can inspect what will be sent
    before committing to a generation.
    """
    blueprints, _ = await _resolve_blueprints(request)

    if request.generation_mode == "advanced":
        plan = await synthesize_advanced(
            user_input=request.user_input,
            blueprints=blueprints,
            music_length_ms=request.music_length_ms,
            lyrics=request.lyrics or "",
        )
        logger.info("Preview (advanced): %d sections", len(plan.get("sections", [])))
        return PreviewResponse(generation_mode="advanced", composition_plan=plan)

    prompt, _ = await synthesize_simple(
        user_input=request.user_input,
        blueprints=blueprints,
        music_length_ms=request.music_length_ms,
    )
    logger.info("Preview (simple): %d chars", len(prompt))
    return PreviewResponse(generation_mode="simple", prompt_used=prompt)
