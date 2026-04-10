import logging

from openai import AsyncOpenAI

from app.config import settings
from app.models import AggregatedTraits

logger = logging.getLogger(__name__)


def _get_openai() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.openai_api_key)


def build_prompt(aggregated: AggregatedTraits) -> str:
    instr = ", ".join(aggregated.instrumentation[:4]) if aggregated.instrumentation else ""
    energy_label = "high energy" if aggregated.energy >= 0.7 else "mid energy" if aggregated.energy >= 0.4 else "low energy"

    parts = [
        f"{aggregated.genre_cluster}",
        f"{aggregated.mood_cluster} mood",
        f"{int(aggregated.avg_bpm)} BPM",
        f"{aggregated.mode_key}",
        energy_label,
    ]
    if instr:
        parts.append(instr)
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
    if not settings.openai_api_key:
        logger.warning("No OpenAI key — using base prompt without LLM enrichment")
        return base_prompt

    client = _get_openai()
    system = (
        "You are a music production assistant. Given a musical profile derived from retrieved "
        "blueprint tracks, write a vivid, evocative music generation prompt. "
        "Stay strictly grounded in the provided traits — do not add genre, mood, instruments, "
        "or tempo that are not present in the profile. Keep the prompt under 120 words."
    )
    user = (
        f"Musical profile:\n"
        f"- Genre: {aggregated.genre_cluster}\n"
        f"- Mood: {aggregated.mood_cluster}\n"
        f"- BPM: {int(aggregated.avg_bpm)}\n"
        f"- Key: {aggregated.mode_key}\n"
        f"- Energy: {aggregated.energy}\n"
        f"- Instrumentation: {', '.join(aggregated.instrumentation)}\n"
        f"- Vocals: {aggregated.vocal_type or 'instrumental'}\n\n"
        f"Base prompt: {base_prompt}\n\n"
        "Write an enriched music generation prompt:"
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=180,
        temperature=0.7,
    )
    enriched = response.choices[0].message.content or base_prompt
    return enriched.strip()
