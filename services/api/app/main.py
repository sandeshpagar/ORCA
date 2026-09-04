from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import init_db
from app.routers import profile, tourist, chat, data_sources


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and seed data sources
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ORCA Marine AI & Coastal Safety Advisory Grid — Phase 1 Backend Service",
    lifespan=lifespan,
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api and root
app.include_router(chat.router)  # Provides POST /chat
app.include_router(chat.router, prefix="/api")  # Also provides POST /api/chat
app.include_router(profile.router, prefix="/api")
app.include_router(tourist.router, prefix="/api")
app.include_router(data_sources.router, prefix="/api")


@app.get("/")
async def root():
    """Root landing endpoint for the ORCA Marine AI API."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
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
    """Healthcheck endpoint for container orchestration and uptime monitoring."""
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
