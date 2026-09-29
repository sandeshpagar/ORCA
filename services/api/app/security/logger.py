import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings

# Regex patterns for credential & PII redacting
BEARER_PATTERN = re.compile(r"Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*", re.IGNORECASE)
OPENROUTER_KEY_PATTERN = re.compile(r"sk-or-v1-[a-zA-Z0-9]+", re.IGNORECASE)
PASSWORD_PATTERN = re.compile(r"(['\"]?password['\"]?\s*[:=]\s*['\"]?)[^\'\"\s,]+", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b")


def sanitize_log_message(msg: str) -> str:
    """
    Strips authorization tokens, API keys, passwords, and sensitive PII from log output.
    Ensures zero secret leakage in cloud log collectors (CloudWatch, Datadog, Grafana Loki).
    """
    if not isinstance(msg, str):
        return str(msg)
    cleaned = BEARER_PATTERN.sub("Bearer [REDACTED_TOKEN]", msg)
    cleaned = OPENROUTER_KEY_PATTERN.sub("sk-or-v1-[REDACTED_KEY]", cleaned)
    cleaned = PASSWORD_PATTERN.sub(r"\1[REDACTED_PASSWORD]", cleaned)
    cleaned = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", cleaned)
    return cleaned


class StructuredJsonFormatter(logging.Formatter):
    """
    Production-grade JSON log formatter for structured observability and metric ingestion.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": sanitize_log_message(record.getMessage()),
            "service": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT,
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "incident_id"):
            log_obj["incident_id"] = getattr(record, "incident_id")
        return json.dumps(log_obj)


def init_error_tracking():
    """
    Initializes Sentry error tracking if SENTRY_DSN is configured.
    Gracefully degrades if sentry-sdk is not installed.
    """
    if not settings.SENTRY_DSN:
        return

    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.1 if settings.is_production else 1.0,
            send_default_pii=False,
        )
        logging.getLogger(__name__).info("Sentry error tracking initialized for environment: %s", settings.ENVIRONMENT)
    except ImportError:
        logging.getLogger(__name__).info("SENTRY_DSN configured, but sentry-sdk package not installed. Skipping Sentry hook.")
    except Exception as exc:
        logging.getLogger(__name__).warning("Non-fatal error initializing Sentry: %s", exc)


def configure_structured_logging():
    """Configures application-wide logging format based on environment."""
    root_logger = logging.getLogger()
    
    # If production or explicitly requested JSON format
    if settings.is_production or settings.LOG_FORMAT.lower() == "json":
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        # Replace existing handlers
        root_logger.handlers = [handler]
        root_logger.setLevel(logging.INFO)
    else:
        # Standard formatted console logger for local development
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    init_error_tracking()
