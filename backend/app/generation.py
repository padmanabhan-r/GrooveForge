import logging
import uuid
from pathlib import Path

import httpx

from app.config import settings
from app.models import AggregatedTraits

logger = logging.getLogger(__name__)

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"
AUDIO_DIR = Path(__file__).parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


async def generate_from_prompt(prompt: str) -> tuple[str, str]:
    """Returns (audio_url, prompt_used)."""
    audio_id = uuid.uuid4().hex
    output_path = AUDIO_DIR / f"{audio_id}.mp3"

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }
    payload = {"prompt": prompt}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{ELEVENLABS_BASE}/music",
            headers=headers,
            json=payload,
        )
        if response.status_code != 200:
            logger.error("ElevenLabs error %d: %s", response.status_code, response.text)
            raise RuntimeError(f"ElevenLabs API error: {response.status_code}")

        output_path.write_bytes(response.content)

    audio_url = f"/static/audio/{audio_id}.mp3"
    logger.info("Generated audio: %s", audio_url)
    return audio_url, prompt


async def generate_from_composition_plan(
    plan: dict,
    aggregated: AggregatedTraits,
) -> tuple[str, str]:
    """Returns (audio_url, prompt_used)."""
    audio_id = uuid.uuid4().hex
    output_path = AUDIO_DIR / f"{audio_id}.mp3"

    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }

    prompt_used = str(plan.get("positive_global_styles", ""))

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            f"{ELEVENLABS_BASE}/music",
            headers=headers,
            json={"composition_plan": plan},
        )
        if response.status_code != 200:
            logger.error("ElevenLabs error %d: %s", response.status_code, response.text)
            raise RuntimeError(f"ElevenLabs API error: {response.status_code}")

        output_path.write_bytes(response.content)

    audio_url = f"/static/audio/{audio_id}.mp3"
    logger.info("Generated audio: %s from composition plan", audio_url)
    return audio_url, prompt_used
