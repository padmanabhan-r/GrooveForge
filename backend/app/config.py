from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    elevenlabs_api_key: str
    turbopuffer_api_key: str
    turbopuffer_region: str = "aws-us-east-1"
    openai_api_key: str = ""
    gemini_api_key: str = ""
    anthropic_api_key: str = ""
    openrouter_api_key: str = ""

    # Active namespace pair — swap to nemotron once indexed (one config change)
    active_ns_lp: str = "lp_msd_minilm"
    active_ns_fma: str = "fma_minilm"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
