from pathlib import Path
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BASE_DIR = Path(__file__).resolve().parent.parent
_ENV_PATHS = [str(_BASE_DIR / ".env"), ".env"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_ENV_PATHS,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "ORCA Marine AI API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api"

    # Supabase Settings
    SUPABASE_URL: str = "https://demo-orca.supabase.co"
    SUPABASE_ANON_KEY: str = "demo-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "demo-service-key"
    SUPABASE_JWT_SECRET: str = "demo-jwt-secret-orca-sih-2026-minimum-32-chars"

    # Database URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./orca_local.db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if not v:
            return "sqlite+aiosqlite:///./orca_local.db"
        import re
        import urllib.parse
        # Convert standard postgres schemes to asyncpg
        if v.startswith("postgres://"):
            v = "postgresql+asyncpg://" + v[len("postgres://"):]
        elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            v = "postgresql+asyncpg://" + v[len("postgresql://"):]

        # Handle unencoded special characters (e.g. '@') in password
        match = re.match(r"^(?P<scheme>[^:]+://)(?P<user>[^:]+):(?P<password>.+)@(?P<host>[^@/]+)/(?P<db>.*)$", v)
        if match:
            scheme = match.group("scheme")
            user = match.group("user")
            password = match.group("password")
            host = match.group("host")
            db = match.group("db")
            if "@" in password:
                encoded_password = urllib.parse.quote_plus(urllib.parse.unquote_plus(password))
                v = f"{scheme}{user}:{encoded_password}@{host}/{db}"

        # Supabase direct hostname `db.<ref>.supabase.co` is IPv6-only, which throws
        # socket.gaierror [Errno 11001] getaddrinfo failed on Windows and IPv4-only networks.
        # Automatically translate to the official IPv4 Supavisor connection pooler.
        if "db.bclravacwzbkknwjyert.supabase.co" in v:
            v = v.replace(
                "db.bclravacwzbkknwjyert.supabase.co:5432",
                "aws-0-ap-southeast-2.pooler.supabase.com:5432",
            ).replace(
                "db.bclravacwzbkknwjyert.supabase.co",
                "aws-0-ap-southeast-2.pooler.supabase.com:5432",
            )
            if "postgres:" in v and "postgres.bclravacwzbkknwjyert:" not in v:
                v = v.replace("postgres:", "postgres.bclravacwzbkknwjyert:", 1)

        return v

    # CORS origins
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]

    # Open-Meteo Integration
    OPEN_METEO_TIMEOUT_SECONDS: float = 10.0

    # Resilient LLM Engine (100% Free: OpenRouter Free Models & Offline Ollama)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"

    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
    DEFAULT_OLLAMA_MODEL: str = "llama3.2"
    LLM_TIMEOUT_SECONDS: float = 60.0


settings = Settings()
