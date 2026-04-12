import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.models import SearchRequest, SoundSearchResponse
from app.retrieval import aggregate_blueprints, search_blueprints
from app.synthesis import analyze_audio

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_MIMES = {
    "audio/mpeg",
    "audio/wav",
    "audio/mp3",
    "audio/aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "audio/m4a",
    "audio/mp4",
    "audio/webm",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/analyze-sound", response_model=SoundSearchResponse)
async def analyze_sound_endpoint(file: UploadFile = File(...)) -> SoundSearchResponse:
    """Upload an audio clip → Gemini analysis → Turbopuffer blueprint retrieval."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_MIMES:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported audio format: {content_type!r}. Accepted: MP3, WAV, OGG, FLAC, AAC, AIFF, WebM.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=422, detail="Audio file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Audio file exceeds the 10 MB limit.")

    analysis = await analyze_audio(file_bytes, content_type)
    logger.info(
        "Sound analysis: bpm=%.1f key=%s mood=%s genres=%s query=%r",
        analysis.bpm_estimate, analysis.key, analysis.mood, analysis.suggested_genres, analysis.search_query,
    )

    bpm_lower = max(30.0, analysis.bpm_estimate - 10)
    bpm_upper = min(300.0, analysis.bpm_estimate + 10)
    if bpm_upper <= bpm_lower:
        bpm_upper = bpm_lower + 20.0

    search_req = SearchRequest(
        free_text=analysis.search_query,
        vibes=analysis.mood + analysis.texture_tags + analysis.suggested_genres,
        bpm_lower=bpm_lower,
        bpm_upper=bpm_upper,
        key=analysis.key if analysis.key != "unknown" else None,
        top_k=8,
    )
    blueprints = await search_blueprints(search_req)

    if not blueprints:
        raise HTTPException(status_code=404, detail="No matching blueprints found for this audio.")

    aggregated = aggregate_blueprints(blueprints)
    logger.info("Sound search returned %d blueprints", len(blueprints))
    return SoundSearchResponse(analysis=analysis, blueprints=blueprints, aggregated=aggregated)
