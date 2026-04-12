import asyncio
import logging
import uuid
from pathlib import Path

from elevenlabs.client import ElevenLabs

from app.config import settings
from app.models import AggregatedTraits

logger = logging.getLogger(__name__)

AUDIO_DIR = Path(__file__).parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# camelCase key mapping for ElevenLabs composition plan API
_PLAN_KEY_MAP = {
    "positive_global_styles": "positiveGlobalStyles",
    "negative_global_styles": "negativeGlobalStyles",
    "section_name": "sectionName",
    "positive_local_styles": "positiveLocalStyles",
    "negative_local_styles": "negativeLocalStyles",
    "duration_ms": "durationMs",
}


def _plan_to_camel(plan: dict) -> dict:
    """Convert snake_case composition plan keys to camelCase for the ElevenLabs SDK."""
    result: dict = {}
    for k, v in plan.items():
        camel_key = _PLAN_KEY_MAP.get(k, k)
        if camel_key == "sections" and isinstance(v, list):
            result[camel_key] = [_plan_to_camel(section) for section in v]
        else:
            result[camel_key] = v
    return result


def _get_client() -> ElevenLabs:
    return ElevenLabs(api_key=settings.elevenlabs_api_key)


def _sync_compose_prompt(prompt: str, music_length_ms: int = 90000) -> bytes:
    client = _get_client()
    chunks = client.music.compose(prompt=prompt, music_length_ms=music_length_ms)
    return b"".join(chunks)


def _sync_compose_plan(plan_camel: dict) -> bytes:
    client = _get_client()
    chunks = client.music.compose(composition_plan=plan_camel)
    return b"".join(chunks)


async def generate_from_prompt(
    prompt: str,
    music_length_ms: int = 90000,
) -> tuple[str, str]:
    """Generate audio from a text prompt. Returns (audio_url, prompt_used)."""
    audio_id = uuid.uuid4().hex
    output_path = AUDIO_DIR / f"{audio_id}.mp3"

    loop = asyncio.get_event_loop()
    audio_bytes = await loop.run_in_executor(
        None, _sync_compose_prompt, prompt, music_length_ms
    )
    output_path.write_bytes(audio_bytes)

    audio_url = f"/static/audio/{audio_id}.mp3"
    logger.info("Generated audio via prompt: %s", audio_url)
    return audio_url, prompt


async def generate_from_composition_plan(
    plan: dict,
    aggregated: AggregatedTraits,
) -> tuple[str, str]:
    """Generate audio from a composition plan. Returns (audio_url, prompt_used)."""
    audio_id = uuid.uuid4().hex
    output_path = AUDIO_DIR / f"{audio_id}.mp3"

    plan_camel = _plan_to_camel(plan)
    prompt_used = ", ".join(plan_camel.get("positiveGlobalStyles", []))

    loop = asyncio.get_event_loop()
    audio_bytes = await loop.run_in_executor(None, _sync_compose_plan, plan_camel)
    output_path.write_bytes(audio_bytes)

    audio_url = f"/static/audio/{audio_id}.mp3"
    logger.info("Generated audio via composition plan: %s", audio_url)
    return audio_url, prompt_used
