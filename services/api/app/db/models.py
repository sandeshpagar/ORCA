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

