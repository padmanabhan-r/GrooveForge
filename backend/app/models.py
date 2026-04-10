from pydantic import BaseModel, Field


class Blueprint(BaseModel):
    id: str
    source_dataset: str = ""
    artist: str = ""
    genre: str
    subgenre: str = ""
    bpm: float
    key: str
    mode: str
    energy: float = Field(ge=0.0, le=1.0)
    acousticness: float = Field(default=0.0, ge=0.0, le=1.0)
    instrumentation: list[str] = []
    themes: list[str] = []
    vocal_type: str = ""
    text_description: str
    similarity_score: float = 0.0


class AggregatedTraits(BaseModel):
    avg_bpm: float
    mode_key: str
    genre_cluster: str
    mood_cluster: str
    instrumentation: list[str]
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
    blueprints: list[Blueprint] = []
    bpm_lower: float | None = None
    bpm_upper: float | None = None
    lyrics: str = ""
    mode: str = Field(default="prompt", pattern="^(prompt|composition_plan)$")


class GenerateResponse(BaseModel):
    audio_url: str
    prompt_used: str
    blueprints: list[Blueprint]
    aggregated: AggregatedTraits
