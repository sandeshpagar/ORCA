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
