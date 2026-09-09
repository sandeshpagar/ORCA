import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Enum as SQLEnum,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class UserRoleEnum(str, enum.Enum):
    TOURIST = "tourist"
    FISHER = "fisher"
    AUTHORITY = "authority"
    RESEARCHER = "researcher"
    DISASTER_MANAGEMENT = "disaster_management"
    GENERAL = "general"


class ReliabilityMode(str, enum.Enum):
    LIVE = "live"
    CACHED = "cached"
    DEMO = "demo"


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(64), primary_key=True, index=True)  # Supabase auth.users UUID
    display_name = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRoleEnum), nullable=False, default=UserRoleEnum.GENERAL)
    language = Column(String(32), default="en")
    home_region_lat = Column(Float, nullable=True, default=19.31)
    home_region_lon = Column(Float, nullable=True, default=84.91)
    home_region_name = Column(String(255), nullable=True, default="Gopalpur Sector")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    tourist_preferences = relationship(
        "TouristPreference", back_populates="profile", uselist=False, cascade="all, delete-orphan"
    )
    conversations = relationship("Conversation", back_populates="profile", cascade="all, delete-orphan")


class TouristPreference(Base):
    __tablename__ = "tourist_preferences"

    user_id = Column(String(64), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    activities = Column(JSON, default=list)  # e.g. ["beach_visit", "boating"]
    travel_style = Column(String(64), default="leisure")
    language = Column(String(32), default="English")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    profile = relationship("Profile", back_populates="tourist_preferences")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    type = Column(String(64), nullable=False)  # weather, ocean, gis, advisory
    reliability = Column(SQLEnum(ReliabilityMode), nullable=False, default=ReliabilityMode.DEMO)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    profile = relationship("Profile", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    role = Column(String(32), nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")


class MapFeature(Base):
    __tablename__ = "map_features"

    id = Column(Integer, primary_key=True, autoincrement=True)
    feature_type = Column(String(64), nullable=False, index=True)  # beach, poi, protected_area, restricted_area, activity_zone, risk_zone
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geometry = Column(JSON, nullable=True)  # GeoJSON representation: Point, Polygon, etc.
    properties = Column(JSON, default=dict)
    reliability = Column(SQLEnum(ReliabilityMode), nullable=False, default=ReliabilityMode.DEMO)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    source_id = Column(Integer, ForeignKey("data_sources.id", ondelete="SET NULL"), nullable=True)
    storage_path = Column(String(512), nullable=True)
    category = Column(String(64), nullable=True)  # regulation, advisory, tourism, safety, research
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), index=True)
    content = Column(Text, nullable=False)
    section_title = Column(String(255), nullable=True)
    embedding = Column(JSON, nullable=True)  # list of floats for embedding vector
    tokens_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="chunks")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(Integer, ForeignKey("data_sources.id", ondelete="SET NULL"), nullable=True)
    observed_at = Column(DateTime(timezone=True), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    metric = Column(String(64), nullable=False)  # sst_celsius, chlorophyll_mg_m3, wave_height_m, wind_kmh, wave_period_s
    value = Column(Float, nullable=False)
    reliability = Column(SQLEnum(ReliabilityMode), nullable=False, default=ReliabilityMode.DEMO)
    properties = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


