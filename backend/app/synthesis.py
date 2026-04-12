import logging

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.config import settings
from app.models import AggregatedTraits, Blueprint, LyricsAnalysis, SoundAnalysis

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-2.5-flash"
_GEMINI_AUDIO_MODEL = "gemini-3.1-pro-preview"          # primary for audio understanding
_GEMINI_AUDIO_FALLBACK_MODEL = "gemini-3-flash-preview"  # fallback if primary unavailable

# Browser MIME types → Gemini-accepted equivalents
_GEMINI_MIME_MAP: dict[str, str] = {
    "audio/mpeg": "audio/mp3",
    "audio/m4a": "audio/mp4",
}

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


# ---------------------------------------------------------------------------
# Structured output schemas
# ---------------------------------------------------------------------------

class SimpleOutput(BaseModel):
    prompt: str
    negative_styles: list[str]


class SectionPlan(BaseModel):
    section_name: str
    positive_local_styles: list[str]
    negative_local_styles: list[str]
    duration_ms: int
    lines: list[str]


class AdvancedOutput(BaseModel):
    positive_global_styles: list[str]
    negative_global_styles: list[str]
    sections: list[SectionPlan]


# ---------------------------------------------------------------------------
# Blueprint context formatter
# ---------------------------------------------------------------------------

def _blueprint_context(blueprints: list[Blueprint]) -> str:
    """Format retrieved blueprints into a readable context block for Gemini.

    Artist names, song titles, and free-text descriptions are deliberately excluded
    — they may contain real artist/track references that must never reach ElevenLabs.
    Only structured numerical/categorical features are included.
    """
    lines: list[str] = []
    for i, bp in enumerate(blueprints, 1):
        parts = [f"Blueprint {i}:"]
        if bp.genre and bp.genre != "unknown":
            parts.append(f"  genre={bp.genre}")
        if bp.bpm:
            parts.append(f"  bpm={bp.bpm:.1f}")
        if bp.key:
            mode_str = f" {bp.mode}" if bp.mode else ""
            parts.append(f"  key={bp.key}{mode_str}")
        parts.append(f"  energy={bp.energy:.2f}")
        parts.append(f"  acousticness={bp.acousticness:.2f}")
        parts.append(f"  danceability={bp.danceability:.2f}")
        parts.append(f"  valence={bp.valence:.2f}")
        parts.append(f"  instrumentalness={bp.instrumentalness:.2f}")
        parts.append(f"  liveness={bp.liveness:.2f}")
        parts.append(f"  speechiness={bp.speechiness:.2f}")
        if bp.loudness:
            parts.append(f"  loudness={bp.loudness:.1f}dB")
        if bp.mood:
            parts.append(f"  mood={bp.mood}")
        if bp.themes:
            parts.append(f"  themes={bp.themes}")
        lines.append("\n".join(parts))
    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Fallbacks (used when Gemini is unavailable)
# ---------------------------------------------------------------------------

def _fallback_prompt(user_input: str, blueprints: list[Blueprint]) -> str:
    if not blueprints:
        return user_input or "music"
    bp = blueprints[0]
    parts = [user_input] if user_input else []
    if bp.genre and bp.genre != "unknown":
        parts.append(bp.genre)
    if bp.mood:
        parts.append(f"{bp.mood} mood")
    if bp.bpm:
        parts.append(f"{int(bp.bpm)} BPM")
    if bp.key:
        parts.append(f"{bp.key} {bp.mode}".strip())
    return ", ".join(parts) if parts else "music"


def _fallback_plan(
    user_input: str,
    blueprints: list[Blueprint],
    music_length_ms: int,
    lyrics: str,
) -> dict:
    prompt = _fallback_prompt(user_input, blueprints)
    lines = [line.strip() for line in lyrics.strip().split("\n") if line.strip()]
    return {
        "positive_global_styles": [prompt],
        "negative_global_styles": [],
        "sections": [
            {
                "section_name": "main",
                "positive_local_styles": [],
                "negative_local_styles": [],
                "duration_ms": music_length_ms,
                "lines": lines,
            }
        ],
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _distinct_genres(blueprints: list[Blueprint]) -> list[str]:
    """Return deduplicated genre list from the blueprint set, ignoring 'unknown'."""
    seen: dict[str, None] = {}
    for bp in blueprints:
        g = (bp.genre or "").strip().lower()
        if g and g != "unknown":
            seen[g] = None
    return list(seen)


def _fusion_hint(genres: list[str]) -> str:
    """Return a fusion instruction when multiple genres are present."""
    if len(genres) < 2:
        return ""
    genre_list = ", ".join(genres)
    return (
        f"- The blueprints span multiple genres ({genre_list}). "
        "The user is likely seeking a genre fusion — deliberately blend elements from all "
        "represented genres rather than defaulting to a single dominant one.\n"
    )


# ---------------------------------------------------------------------------
# Gemini synthesis functions
# ---------------------------------------------------------------------------

async def synthesize_simple(
    user_input: str,
    blueprints: list[Blueprint],
    music_length_ms: int,
) -> tuple[str, list[str]]:
    """Use Gemini to generate a rich text prompt grounded in retrieved blueprints.

    Returns (prompt_text, negative_styles).
    """
    if not settings.gemini_api_key:
        logger.warning("No Gemini key — using fallback prompt")
        return _fallback_prompt(user_input, blueprints), []

    length_s = music_length_ms // 1000
    blueprint_ctx = _blueprint_context(blueprints)
    fusion = _fusion_hint(_distinct_genres(blueprints))

    system_prompt = (
        "You are a music production AI. Your job is to write a vivid, evocative music generation "
        "prompt that will be sent to ElevenLabs Music API.\n\n"
        "Rules:\n"
        "- The user's input has PRIMARY importance — honour their genre/mood/key/tempo choices exactly.\n"
        f"{fusion}"
        "- Use the retrieved blueprint traits to add nuance, texture, and specificity.\n"
        "- Do NOT fabricate traits absent from both the input and the blueprints.\n"
        "- NEVER mention any real artist names, band names, song titles, or album names. "
        "Describe sound attributes only (genre, instrumentation, mood, tempo, energy).\n"
        "- Keep the prompt under 150 words, vivid and concrete.\n"
        f"- The track should be approximately {length_s} seconds long.\n\n"
        "Respond with a JSON object matching the schema:\n"
        '{ "prompt": "...", "negative_styles": ["...", ...] }'
    )

    user_message = (
        f"User input: {user_input or '(none provided)'}\n\n"
        f"Retrieved blueprints:\n{blueprint_ctx}"
    )

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=_GEMINI_MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=SimpleOutput,
                temperature=0.7,
            ),
        )
        parsed = SimpleOutput.model_validate_json(response.text or "{}")
        return parsed.prompt, parsed.negative_styles
    except Exception:
        logger.exception("Gemini synthesize_simple failed — using fallback")
        return _fallback_prompt(user_input, blueprints), []


async def synthesize_advanced(
    user_input: str,
    blueprints: list[Blueprint],
    music_length_ms: int,
    lyrics: str = "",
) -> dict:
    """Use Gemini to generate a structured composition plan for ElevenLabs.

    Returns a snake_case dict ready for _plan_to_camel().
    """
    if not settings.gemini_api_key:
        logger.warning("No Gemini key — using fallback composition plan")
        return _fallback_plan(user_input, blueprints, music_length_ms, lyrics)

    length_s = music_length_ms // 1000
    blueprint_ctx = _blueprint_context(blueprints)
    fusion = _fusion_hint(_distinct_genres(blueprints))
    lyrics_note = (
        f"\nLyrics provided (MUST go into section `lines` only, never into styles):\n{lyrics}\n"
        if lyrics else ""
    )

    system_prompt = (
        "You are a music production AI. Generate a structured composition plan for ElevenLabs Music API.\n\n"
        "Rules:\n"
        "- The user's input has PRIMARY importance — honour genre/mood/key/tempo exactly.\n"
        f"{fusion}"
        "- Blueprint traits provide nuance — use acousticness, energy, valence, danceability, "
        "instrumentalness, liveness, speechiness, and loudness to inform style descriptors.\n"
        "- Do NOT fabricate traits.\n"
        "- NEVER mention any real artist names, band names, song titles, or album names. "
        "Describe sound attributes only (genre, instrumentation, mood, tempo, energy).\n"
        "- Distribute duration_ms across sections so they sum to exactly "
        f"{music_length_ms} ms (≈ {length_s}s total).\n"
        "- Typical structure: intro ~10%, verse ~25%, chorus ~20%, bridge ~15%, outro ~10% "
        "(adjust based on the music style).\n"
        "- If lyrics are provided, they go ONLY into section `lines` — never into styles.\n"
        "- If no lyrics, leave all `lines` arrays empty.\n\n"
        "Respond with a JSON object matching the AdvancedOutput schema."
    )

    user_message = (
        f"User input: {user_input or '(none provided)'}\n"
        f"{lyrics_note}"
        f"\nRetrieved blueprints:\n{blueprint_ctx}"
    )

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=_GEMINI_MODEL,
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=AdvancedOutput,
                temperature=0.7,
            ),
        )
        parsed = AdvancedOutput.model_validate_json(response.text or "{}")
        return parsed.model_dump()
    except Exception:
        logger.exception("Gemini synthesize_advanced failed — using fallback plan")
        return _fallback_plan(user_input, blueprints, music_length_ms, lyrics)


# ---------------------------------------------------------------------------
# Lyrics analysis
# ---------------------------------------------------------------------------

class _LyricsAnalysisOutput(BaseModel):
    mood: list[str]
    themes: list[str]
    energy: float
    suggested_genres: list[str]
    vocal_style: str
    search_query: str


def _fallback_lyrics_analysis(lyrics: str) -> LyricsAnalysis:
    lower = lyrics.lower()
    mood: list[str] = ["introspective"]
    if any(w in lower for w in ("love", "heart", "miss", "want", "hold")):
        mood.append("romantic")
    if any(w in lower for w in ("dark", "shadow", "pain", "alone", "break", "cry")):
        mood.append("melancholic")
    if any(w in lower for w in ("dance", "move", "beat", "alive", "fire", "run")):
        mood.append("energetic")
    genres = ["indie pop"]
    search_query = " ".join(mood[:3]) + " " + " ".join(genres) + " vocal music"
    return LyricsAnalysis(
        mood=mood[:3],
        themes=["personal narrative", "emotions"],
        energy=0.5,
        suggested_genres=genres,
        vocal_style="expressive vocals",
        search_query=search_query,
    )


async def analyze_lyrics(lyrics: str) -> LyricsAnalysis:
    """Use Gemini to extract musical traits from lyrics for blueprint retrieval."""
    if not settings.gemini_api_key:
        logger.warning("No Gemini key — using fallback lyrics analysis")
        return _fallback_lyrics_analysis(lyrics)

    system_prompt = (
        "You are a music supervisor analyzing song lyrics to find the right musical setting.\n\n"
        "Given lyrics, extract:\n"
        "- mood: 2–4 emotional adjectives (e.g. melancholic, yearning, defiant)\n"
        "- themes: 2–4 lyrical themes (e.g. loss, city life, rebellion, nostalgia)\n"
        "- energy: float 0.0–1.0 (0=ambient/slow, 1=intense/driving)\n"
        "- suggested_genres: 2–3 music genres that would suit these lyrics\n"
        "- vocal_style: a short phrase describing ideal vocal delivery\n"
        "- search_query: a concise phrase (under 20 words) of genre + mood + theme keywords "
        "suitable for searching a music database — no artist names, no song titles\n\n"
        "Respond with a JSON object matching the schema."
    )

    try:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=_GEMINI_MODEL,
            contents=f"Lyrics:\n{lyrics}",
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=_LyricsAnalysisOutput,
                temperature=0.5,
            ),
        )
        parsed = _LyricsAnalysisOutput.model_validate_json(response.text or "{}")
        energy = max(0.0, min(1.0, float(parsed.energy)))
        return LyricsAnalysis(
            mood=parsed.mood,
            themes=parsed.themes,
            energy=energy,
            suggested_genres=parsed.suggested_genres,
            vocal_style=parsed.vocal_style,
            search_query=parsed.search_query,
        )
    except Exception:
        logger.exception("Gemini analyze_lyrics failed — using fallback")
        return _fallback_lyrics_analysis(lyrics)


# ---------------------------------------------------------------------------
# Audio analysis
# ---------------------------------------------------------------------------

class _SoundAnalysisOutput(BaseModel):
    bpm_estimate: float
    key: str
    mode: str
    mood: list[str]
    texture_tags: list[str]
    energy: float
    suggested_genres: list[str]
    search_query: str


def _fallback_sound_analysis() -> SoundAnalysis:
    return SoundAnalysis(
        bpm_estimate=120.0,
        key="unknown",
        mode="unknown",
        mood=["atmospheric"],
        texture_tags=["ambient"],
        energy=0.5,
        suggested_genres=["electronic"],
        search_query="120 BPM electronic atmospheric",
    )


async def analyze_audio(audio_bytes: bytes, mime_type: str) -> SoundAnalysis:
    """Use Gemini to extract musical traits from an audio clip for blueprint retrieval."""
    if not settings.gemini_api_key:
        logger.warning("No Gemini key — using fallback sound analysis")
        return _fallback_sound_analysis()

    gemini_mime = _GEMINI_MIME_MAP.get(mime_type, mime_type)

    system_prompt = (
        "You are a music supervisor analyzing an audio clip to identify its musical characteristics.\n\n"
        "Extract the following from the audio:\n"
        "- bpm_estimate: estimated tempo in beats per minute (float)\n"
        "- key: root note of the musical key (e.g. 'C', 'F#') or 'unknown' if unclear\n"
        "- mode: 'major', 'minor', or 'unknown'\n"
        "- mood: 2–4 emotional adjectives describing the feel (e.g. melancholic, energetic, tense)\n"
        "- texture_tags: 2–4 sonic texture descriptors (e.g. reverb-heavy, punchy drums, warm pads)\n"
        "- energy: float 0.0–1.0 (0=ambient/slow/quiet, 1=intense/driving/loud)\n"
        "- suggested_genres: 2–3 music genres that best describe this audio\n"
        "- search_query: a concise phrase under 20 words of genre + mood + texture keywords "
        "suitable for searching a music database — NO artist names, NO song titles, NO album names\n\n"
        "Respond with a JSON object matching the schema."
    )

    async def _call(model: str) -> SoundAnalysis:
        client = _get_client()
        response = await client.aio.models.generate_content(
            model=model,
            contents=[
                types.Part(text="Analyze this audio clip and extract its musical characteristics."),
                types.Part(inline_data=types.Blob(data=audio_bytes, mime_type=gemini_mime)),
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=_SoundAnalysisOutput,
                temperature=0.3,
            ),
        )
        parsed = _SoundAnalysisOutput.model_validate_json(response.text or "{}")
        energy = max(0.0, min(1.0, float(parsed.energy)))
        return SoundAnalysis(
            bpm_estimate=float(parsed.bpm_estimate),
            key=parsed.key,
            mode=parsed.mode,
            mood=parsed.mood,
            texture_tags=parsed.texture_tags,
            energy=energy,
            suggested_genres=parsed.suggested_genres,
            search_query=parsed.search_query,
        )

    try:
        return await _call(_GEMINI_AUDIO_MODEL)
    except Exception as primary_exc:
        logger.warning("Gemini primary audio model failed (%s), retrying with fallback: %s", _GEMINI_AUDIO_MODEL, primary_exc)
        try:
            return await _call(_GEMINI_AUDIO_FALLBACK_MODEL)
        except Exception:
            logger.exception("Gemini analyze_audio fallback also failed — using static fallback")
            return _fallback_sound_analysis()


# ---------------------------------------------------------------------------
# Legacy helpers (kept for backward compatibility during transition)
# ---------------------------------------------------------------------------

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
