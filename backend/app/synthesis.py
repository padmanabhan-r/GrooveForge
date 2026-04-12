import logging

from google import genai
from google.genai import types

from app.config import settings
from app.models import AggregatedTraits

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-2.5-flash"
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def build_prompt(aggregated: AggregatedTraits) -> str:
    energy_label = (
        "high energy" if aggregated.energy >= 0.7
        else "mid energy" if aggregated.energy >= 0.4
        else "low energy"
    )
    parts = [
        aggregated.genre_cluster,
        f"{aggregated.mood_cluster} mood",
        f"{int(aggregated.avg_bpm)} BPM",
        aggregated.mode_key,
        energy_label,
    ]
    if aggregated.vocal_type:
        parts.append(aggregated.vocal_type)
    return ", ".join(parts)


def build_composition_plan(aggregated: AggregatedTraits, lyrics: str) -> dict:
    global_style = build_prompt(aggregated)
    lines = [line.strip() for line in lyrics.strip().split("\n") if line.strip()]
    return {
        "positive_global_styles": [global_style],
        "negative_global_styles": [],
        "sections": [
            {
                "section_name": "main",
                "positive_local_styles": [],
                "negative_local_styles": [],
                "duration_ms": 60000,
                "lines": lines,
            }
        ],
    }


async def enrich_prompt(base_prompt: str, aggregated: AggregatedTraits) -> str:
    if not settings.gemini_api_key:
        logger.warning("No Gemini key — using base prompt without LLM enrichment")
        return base_prompt

    prompt_text = (
        "You are a music production assistant. Given a musical profile derived from retrieved "
        "blueprint tracks, write a vivid, evocative music generation prompt. "
        "Stay strictly grounded in the provided traits — do not add genre, mood, instruments, "
        "or tempo that are not present in the profile. Keep the prompt under 120 words.\n\n"
        f"Musical profile:\n"
        f"- Genre: {aggregated.genre_cluster}\n"
        f"- Mood: {aggregated.mood_cluster}\n"
        f"- BPM: {int(aggregated.avg_bpm)}\n"
        f"- Key: {aggregated.mode_key}\n"
        f"- Energy: {aggregated.energy}\n"
        f"- Vocals: {aggregated.vocal_type or 'instrumental'}\n\n"
        f"Base prompt: {base_prompt}\n\n"
        "Write an enriched music generation prompt:"
    )

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=_GEMINI_MODEL,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                max_output_tokens=200,
                temperature=0.7,
            ),
        )
        enriched = response.text or base_prompt
        return enriched.strip()
    except Exception:
        logger.exception("Gemini enrichment failed — falling back to base prompt")
        return base_prompt
