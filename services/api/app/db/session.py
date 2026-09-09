import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.config import settings
from app.db.models import Base, DataSource, ReliabilityMode

logger = logging.getLogger(__name__)

FALLBACK_SQLITE_URL = "sqlite+aiosqlite:///./orca_local.db"

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db():
    """Initializes tables and seeds default data sources with resilient local fallback."""
    global engine, async_session_maker

    # 1. Attempt connecting to the primary configured database
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1;"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Primary database connected and tables verified.")
    except Exception as exc:
        logger.warning(
            "Primary database connection failed (%s: %s). Activating resilient local SQLite fallback...",
            type(exc).__name__,
            exc,
        )
        try:
            engine = create_async_engine(
                FALLBACK_SQLITE_URL,
                echo=False,
                future=True,
            )
            async_session_maker = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Resilient local SQLite database initialized successfully.")
        except Exception as fallback_exc:
            logger.error("Failed to initialize fallback database: %s", fallback_exc)
            return

    # 2. Seed default data sources and knowledge base
    try:
        async with async_session_maker() as session:
            default_sources = [
                ("Open-Meteo Marine & Weather API", "weather", ReliabilityMode.LIVE),
                ("INCOIS Potential Fishing Zone (PFZ)", "ocean", ReliabilityMode.CACHED),
                ("ISRO Oceansat-3 OCM-3 Chlorophyll", "ocean", ReliabilityMode.CACHED),
                ("IMD Cyclone Warning Division", "advisory", ReliabilityMode.LIVE),
                ("Gopalpur Coastal Buoy BD-12", "ocean", ReliabilityMode.LIVE),
            ]
            for name, src_type, rel in default_sources:
                from sqlalchemy import select
                stmt = select(DataSource).where(DataSource.name == name)
                res = await session.execute(stmt)
                existing = res.scalar_one_or_none()
                if not existing:
                    session.add(DataSource(name=name, type=src_type, reliability=rel))
            await session.commit()

            # Seed demo map features
            from app.routers.maps import ensure_demo_features_seeded
            await ensure_demo_features_seeded(session)

            # Seed grounded RAG knowledge documents
            from app.rag.knowledge_base import seed_rag_knowledge_to_db
            await seed_rag_knowledge_to_db(session)
    except Exception as seed_exc:
        logger.warning("Data source seeding encountered notice: %s", seed_exc)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
