from pathlib import Path
from typing import List, Union, Optional
from pydantic import field_validator, model_validator
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
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api"

    # Supabase Settings
    SUPABASE_URL: str = "https://demo-orca.supabase.co"
    SUPABASE_ANON_KEY: str = "demo-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "demo-service-key"
    SUPABASE_JWT_SECRET: str = "demo-jwt-secret-orca-sih-2026-minimum-32-chars"

    # Super Admin Server Configuration
    ADMIN_EMAIL: str = "admin@gmail.com"
    ADMIN_PASSWORD: str = "@dminS123"

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
        if ".supabase.co" in v and "db." in v:
            ref_match = re.search(r"db\.([a-z0-9]+)\.supabase\.co", v)
            if ref_match:
                ref = ref_match.group(1)
                pooler_host = f"aws-0-ap-southeast-2.pooler.supabase.com:5432"
                v = re.sub(r"db\.[a-z0-9]+\.supabase\.co(?::5432)?", pooler_host, v)
                if f"postgres.{ref}:" not in v and "postgres:" in v:
                    v = v.replace("postgres:", f"postgres.{ref}:", 1)

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

    # Logging & Observability
    LOG_FORMAT: str = "text"
    SENTRY_DSN: Optional[str] = None

    # OpenRouter Usage & Budget Guard
    OPENROUTER_DAILY_LIMIT_PER_USER: int = 50

    # Resilient LLM Engine (100% Free: OpenRouter Free Models & Offline Ollama)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_OPENROUTER_MODEL: str = "liquid/lfm-2.5-2.6b:free"

    @field_validator("OPENROUTER_API_KEY", mode="before")
    @classmethod
    def load_openrouter_key(cls, v: str) -> str:
        import os
        api_env_file = _BASE_DIR / ".env"
        file_k = ""
        if api_env_file.exists():
            try:
                with open(api_env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line_s = line.strip()
                        if line_s.startswith("OPENROUTER_API_KEY="):
                            cand = line_s.split("=", 1)[1].strip().strip('"').strip("'")
                            if len(cand) >= 30:
                                file_k = cand
                                break
            except Exception:
                pass

        env_val = os.environ.get("OPENROUTER_API_KEY", "").strip()
        # If env_val is provided and valid (>= 30 chars), use it
        if env_val and len(env_val) >= 30 and not env_val.startswith("sk-or-v1-stale"):
            return env_val

        # If file provides a valid key, prefer it over missing or truncated environment values
        if file_k:
            os.environ["OPENROUTER_API_KEY"] = file_k
            return file_k

        if v and str(v).strip() and len(str(v).strip()) >= 30:
            return str(v).strip()

        return env_val or ""


    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434/v1"
    DEFAULT_OLLAMA_MODEL: str = "llama3.2"
    LLM_TIMEOUT_SECONDS: float = 90.0

    @model_validator(mode="after")
    def validate_production_invariants(self) -> "Settings":
        env_clean = (self.ENVIRONMENT or "").strip().lower()
        if env_clean == "production":
            # 1. Supabase JWT Secret must be secure and >= 32 characters
            if (
                not self.SUPABASE_JWT_SECRET
                or self.SUPABASE_JWT_SECRET.startswith("demo-jwt-secret")
                or len(self.SUPABASE_JWT_SECRET) < 32
            ):
                raise ValueError(
                    "Production invariant violation: SUPABASE_JWT_SECRET must be set to a cryptographically secure key (minimum 32 characters) and cannot use demo defaults."
                )

            # 2. Database URL must be a production PostgreSQL database, not SQLite
            if not self.DATABASE_URL or "sqlite" in self.DATABASE_URL.lower():
                raise ValueError(
                    "Production invariant violation: DATABASE_URL must configure a PostgreSQL database (postgresql+asyncpg://...) for production deployment, not SQLite."
                )

            # 3. Supabase URL must be a real project, not demo
            if not self.SUPABASE_URL or "demo-orca" in self.SUPABASE_URL.lower():
                raise ValueError(
                    "Production invariant violation: SUPABASE_URL must be configured to your production Supabase project."
                )

            # 4. FRONTEND_URL must be configured and cannot be localhost
            if (
                not self.FRONTEND_URL
                or "localhost" in self.FRONTEND_URL.lower()
                or "127.0.0.1" in self.FRONTEND_URL
            ):
                raise ValueError(
                    "Production invariant violation: FRONTEND_URL must be set to the canonical production origin (e.g. https://orca-marine.in) and cannot point to localhost."
                )

        return self

    @property
    def is_production(self) -> bool:
        return (self.ENVIRONMENT or "").strip().lower() == "production"


settings = Settings()
