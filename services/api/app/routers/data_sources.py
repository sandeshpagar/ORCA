from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime

from app.db.session import get_db
from app.db.models import DataSource

router = APIRouter(prefix="/data-sources", tags=["Data Sources Registry"])


class DataSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    reliability: str
    updated_at: datetime


@router.get("", response_model=List[DataSourceResponse])
async def list_data_sources(db: AsyncSession = Depends(get_db)):
    """
    Returns the data source registry with transparency on LIVE, CACHED, or DEMO reliability mode.
    Reference: docs/04_Design_Document.md §4.
    """
    stmt = select(DataSource).order_by(DataSource.id.asc())
    result = await db.execute(stmt)
    sources = result.scalars().all()
    return sources


from app.ingestion.eo_adapter import eo_adapter, EarthObservationDataset


@router.get("/observations/latest", response_model=EarthObservationDataset)
async def get_latest_observations(
    latitude: float = 19.31,
    longitude: float = 84.91,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns normalized multi-sensor Earth Observation dataset (SST, chlorophyll, wave, wind, currents)
    for given coordinates, preserving data provenance and reliability mode.
    """
    dataset = await eo_adapter.fetch_and_normalize(latitude=latitude, longitude=longitude)
    await eo_adapter.persist_to_db(db, dataset)
    return dataset
