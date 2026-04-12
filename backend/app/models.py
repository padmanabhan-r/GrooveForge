from typing import Literal

from pydantic import BaseModel, Field


class Blueprint(BaseModel):
    id: str
    source: str = ""           # "lp_msd" or "fma"
    title: str = ""
    artist: str = ""           # lp_msd only
    genre: str = "unknown"
    genres_all: str = ""       # fma only — comma-separated
    bpm: float = 120.0
    key: str = ""              # lp_msd only
    mode: str = ""             # lp_msd only
    energy: float = Field(default=0.5, ge=0.0, le=1.0)
    acousticness: float = Field(default=0.0, ge=0.0, le=1.0)
    valence: float = Field(default=0.5, ge=0.0, le=1.0)
    danceability: float = Field(default=0.5, ge=0.0, le=1.0)
    instrumentalness: float = Field(default=0.0, ge=0.0, le=1.0)
    liveness: float = Field(default=0.0, ge=0.0, le=1.0)
    speechiness: float = Field(default=0.0, ge=0.0, le=1.0)
    loudness: float = 0.0      # dB, typically -60 to 0
    vocal_type: str = ""
    mood: str = ""
    themes: str = ""           # lp_msd only — space-joined theme tokens
    tags: str = ""             # lp_msd only — all raw tags space-joined
    caption_summary: str = ""  # lp_msd only
    text_description: str = "" # full text field used for retrieval
    similarity_score: float = 0.0


class AggregatedTraits(BaseModel):
    avg_bpm: float
    mode_key: str
    genre_cluster: str
    mood_cluster: str
    energy: float
    vocal_type: str


class SearchRequest(BaseModel):
    vibes: list[str] = []
    bpm_lower: float | None = None
    bpm_upper: float | None = None
    key: str | None = None
    vocal_type: str | None = None
    free_text: str = ""
    artist: str = ""
    top_k: int = Field(default=8, ge=1, le=20)


class SearchResponse(BaseModel):
    blueprints: list[Blueprint]
    aggregated: AggregatedTraits


class GenerateRequest(BaseModel):
    vibes: list[str] = []
    free_text: str = ""
    blueprints: list[Blueprint] = []
    bpm_lower: float | None = None
    bpm_upper: float | None = None
    lyrics: str = ""
    user_input: str = ""
    generation_mode: Literal["simple", "advanced"] = "simple"
    music_length_ms: int = 90000


class GenerateResponse(BaseModel):
    audio_url: str
    prompt_used: str
    blueprints: list[Blueprint]
    aggregated: AggregatedTraits


class PreviewResponse(BaseModel):
    generation_mode: Literal["simple", "advanced"]
    prompt_used: str = ""          # populated for simple mode
    composition_plan: dict | None = None  # populated for advanced mode
