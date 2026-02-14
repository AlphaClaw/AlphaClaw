from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "ALPHACLAW_", "env_file": ".env", "extra": "ignore"}

    # LLM
    model: str = "anthropic/claude-sonnet-4-5-20250929"

    # Database (reads DATABASE_URL, not ALPHACLAW_DATABASE_URL)
    database_url: str = Field(
        default="postgresql://alphaclaw:alphaclaw@localhost:5432/alphaclaw",
        validation_alias="DATABASE_URL",
    )

    # Web
    web_host: str = "0.0.0.0"
    web_port: int = 8000

    # Channels (empty = disabled)
    telegram_bot_token: str = ""
    discord_bot_token: str = ""
    slack_bot_token: str = ""
    slack_app_token: str = ""
    teams_app_id: str = ""
    teams_app_password: str = ""

    @property
    def pydantic_ai_model(self) -> str:
        """Convert 'anthropic/model' (LiteLLM style) to 'anthropic:model' (PydanticAI style)."""
        m = self.model
        if "/" in m and ":" not in m:
            prefix, _, rest = m.partition("/")
            return f"{prefix}:{rest}"
        return m

    # Financial data
    polygon_api_key: str = ""

    # Daily brief schedule
    brief_cron: str = "30 7 * * 1-5"
    brief_timezone: str = "America/New_York"


settings = Settings()
