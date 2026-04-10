from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    elevenlabs_api_key: str
    turbopuffer_api_key: str
    turbopuffer_region: str = "aws-us-east-1"
    openai_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
