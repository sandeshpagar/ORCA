from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.db.models import Base, DataSource, ReliabilityMode

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
    """Initializes tables and seeds default data sources."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default data sources
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


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
