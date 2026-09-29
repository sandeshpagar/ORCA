from contextlib import asynccontextmanager
import logging
import uuid
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.db.session import init_db, get_db
from app.routers import profile, tourist, chat, data_sources, maps, admin

from app.security.logger import configure_structured_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Configure structured observability and error tracking
    try:
        configure_structured_logging()
    except Exception as exc:
        logger.warning("Logging setup encountered non-fatal notice: %s", exc)

    # Initialize database tables and seed data sources
    try:
        await init_db()
    except Exception as exc:
        logger.warning("Startup init_db encountered non-fatal notice: %s", exc)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ORCA Marine AI & Coastal Safety Advisory Grid — Hardened API Service",
    lifespan=lifespan,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects standard defensive HTTP security headers on all responses (Task 3.6).
    Protects against MIME sniffing, clickjacking, and XSS.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


# Attach Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# Configure CORS strictly: production locks strictly to FRONTEND_URL without regex (Task 3.1)
if settings.is_production:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Production Error Sanitizer: never leak internal stack traces or paths (Task 3.5)
@app.exception_handler(Exception)
async def production_exception_handler(request: Request, exc: Exception):
    incident_id = str(uuid.uuid4())
    logger.error("Unhandled server exception [Incident: %s]: %s", incident_id, exc, exc_info=True)
    if settings.is_production:
        return JSONResponse(
            status_code=500,
            content={"detail": f"An internal server error occurred. Incident reference: {incident_id}"},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "incident_id": incident_id},
    )


# Register routers under /api and root
app.include_router(admin.auth_router)
app.include_router(admin.admin_router, prefix="/api")
app.include_router(admin.admin_router)
app.include_router(chat.router)  # Provides POST /chat
app.include_router(chat.router, prefix="/api")  # Also provides POST /api/chat
app.include_router(profile.router, prefix="/api")
app.include_router(tourist.router, prefix="/api")
app.include_router(tourist.plan_router, prefix="/api")
app.include_router(data_sources.router, prefix="/api")
app.include_router(maps.router)


@app.get("/")
async def root():
    """Root landing endpoint for the ORCA Marine AI API."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "endpoints": {
            "chat": "POST /chat",
            "profile": "GET /api/profile",
            "role": "POST /api/profile/role",
            "data_sources": "GET /api/data-sources",
            "tourist_preferences": "GET /api/tourist/preferences",
        },
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    """
    Task 3.7 Liveness Probe:
    Pure in-memory process check. Never makes external calls or touches the database,
    ensuring it cannot fail just because Supabase/Postgres is briefly slow.
    """
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.get("/ready")
@app.get("/api/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Task 3.7 Readiness Probe:
    Verifies that the database connection is alive with a fast lightweight query (SELECT 1).
    Never exposes internal database URLs, credentials, or sensitive hostnames.
    """
    from sqlalchemy import text
    try:
        await db.execute(text("SELECT 1;"))
        return {
            "status": "ready",
            "database": "connected",
        }
    except Exception as exc:
        logger.warning("Readiness probe check failed: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "detail": "Database is not currently reachable.",
            },
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
