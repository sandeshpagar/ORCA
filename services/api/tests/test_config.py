import pytest
from pydantic import ValidationError
from app.config import Settings


def test_default_development_config_loads():
    """Verify default development and test configuration loads cleanly without exceptions."""
    s = Settings(ENVIRONMENT="development")
    assert s.ENVIRONMENT == "development"
    assert s.PROJECT_NAME == "ORCA Marine AI API"
    assert s.DATABASE_URL is not None
    assert s.SUPABASE_JWT_SECRET is not None


def test_production_fails_with_demo_jwt_secret():
    """Verify production fails fast if demo JWT secret is used."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="demo-jwt-secret-orca-sih-2026-minimum-32-chars",
            SUPABASE_URL="https://prod-orca.supabase.co",
            DATABASE_URL="postgresql+asyncpg://user:pass@db.example.com:5432/orca",
            FRONTEND_URL="https://orca.example.com",
        )
    assert "SUPABASE_JWT_SECRET" in str(exc_info.value)


def test_production_fails_with_short_jwt_secret():
    """Verify production fails fast if JWT secret is shorter than 32 characters."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="short-insecure-key",
            SUPABASE_URL="https://prod-orca.supabase.co",
            DATABASE_URL="postgresql+asyncpg://user:pass@db.example.com:5432/orca",
            FRONTEND_URL="https://orca.example.com",
        )
    assert "SUPABASE_JWT_SECRET" in str(exc_info.value)


def test_production_fails_with_sqlite_database():
    """Verify production fails fast if SQLite is configured instead of PostgreSQL."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="valid-strong-production-secret-with-over-32-chars",
            SUPABASE_URL="https://prod-orca.supabase.co",
            DATABASE_URL="sqlite+aiosqlite:///./orca_local.db",
            FRONTEND_URL="https://orca.example.com",
        )
    assert "DATABASE_URL" in str(exc_info.value)


def test_production_fails_with_demo_supabase_url():
    """Verify production fails fast if demo Supabase URL is used."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="valid-strong-production-secret-with-over-32-chars",
            SUPABASE_URL="https://demo-orca.supabase.co",
            DATABASE_URL="postgresql+asyncpg://user:pass@db.example.com:5432/orca",
            FRONTEND_URL="https://orca.example.com",
        )
    assert "SUPABASE_URL" in str(exc_info.value)


def test_production_fails_with_localhost_frontend_url():
    """Verify production fails fast if localhost is used as FRONTEND_URL."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="valid-strong-production-secret-with-over-32-chars",
            SUPABASE_URL="https://prod-orca.supabase.co",
            DATABASE_URL="postgresql+asyncpg://user:pass@db.example.com:5432/orca",
            FRONTEND_URL="http://localhost:3000",
        )
    assert "FRONTEND_URL" in str(exc_info.value)


def test_production_succeeds_with_valid_settings():
    """Verify production configuration initializes cleanly when all production requirements are satisfied."""
    s = Settings(
        ENVIRONMENT="production",
        SUPABASE_JWT_SECRET="super-secure-production-secret-orca-2026-32chars",
        SUPABASE_URL="https://prod-orca.supabase.co",
        DATABASE_URL="postgresql+asyncpg://prod_user:prod_pass@db.example.com:5432/orca",
        FRONTEND_URL="https://orca.gov.in",
    )
    assert s.ENVIRONMENT == "production"
    assert "postgresql+asyncpg://" in s.DATABASE_URL
    assert s.FRONTEND_URL == "https://orca.gov.in"


def test_database_url_normalization():
    """Verify DATABASE_URL normalizer converts schemes and encodes special characters."""
    s1 = Settings(DATABASE_URL="postgres://user:p%40ss@host:5432/db")
    assert s1.DATABASE_URL.startswith("postgresql+asyncpg://")

    s2 = Settings(DATABASE_URL="postgresql://user:p%40ss@host:5432/db")
    assert s2.DATABASE_URL.startswith("postgresql+asyncpg://")


def test_openrouter_key_prefers_valid_env_file_over_stale_system_env(tmp_path, monkeypatch):
    """Verify that a truncated or invalid system env var does not override a valid key from .env file."""
    import app.config as config_mod
    env_file = tmp_path / ".env"
    env_file.write_text("OPENROUTER_API_KEY=sk-or-v1-validkeylongerthanthirtycharacters12345\n", encoding="utf-8")
    monkeypatch.setattr(config_mod, "_BASE_DIR", tmp_path)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-stale18chars")
    s = Settings()
    # The valid key from .env is >= 30 chars; it must not be corrupted by the 18-char stale system env var
    assert len(s.OPENROUTER_API_KEY) >= 30
    assert not s.OPENROUTER_API_KEY.endswith("stale18chars")

