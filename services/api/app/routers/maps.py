"""
Map Layers & Spatial GIS Router — ORCA (Phase 3)
Provides role-aware map overlays, bounding-box queries, proximity lookups,
point-in-polygon containment checks, and suitability ranking.

MANDATES:
- Server-side role protection: Sensitive defense/enforcement layers are strictly
  omitted from the response payload for unauthorized roles (Tourist, General).
- Data honesty (PRD §8): Clearly tagged as ReliabilityMode.DEMO.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import MapFeature, UserRoleEnum, ReliabilityMode
from app.auth.deps import get_current_user_and_role, get_optional_user_and_role
from app.spatial.utils import (
    haversine_distance_km,
    point_in_geometry,
    bbox_intersects,
)
from app.spatial.seed_data import DEMO_MAP_FEATURES
from app.agents.suitability_risk_engine import evaluate_activity_suitability

router = APIRouter(prefix="/api", tags=["maps"])


async def ensure_demo_features_seeded(session: AsyncSession):
    """Idempotently seeds demo map features into the database, synchronizing properties and purging orphans."""
    existing = await session.execute(select(MapFeature))
    existing_records = {mf.name: mf for mf in existing.scalars().all()}
    modified = False

    demo_names = {f["name"] for f in DEMO_MAP_FEATURES}

    for f in DEMO_MAP_FEATURES:
        name = f["name"]
        desired_props = f.get("properties", {})
        if name in existing_records:
            mf = existing_records[name]
            # Ensure properties are fully synced (including region_id and allowed_roles)
            if dict(mf.properties or {}) != desired_props:
                mf.properties = desired_props
                modified = True
            if mf.feature_type != f["feature_type"]:
                mf.feature_type = f["feature_type"]
                modified = True
            if mf.latitude != f["latitude"] or mf.longitude != f["longitude"]:
                mf.latitude = f["latitude"]
                mf.longitude = f["longitude"]
                modified = True
            if f.get("geometry") and mf.geometry != f.get("geometry"):
                mf.geometry = f.get("geometry")
                modified = True
        else:
            mf = MapFeature(
                name=name,
                feature_type=f["feature_type"],
                latitude=f["latitude"],
                longitude=f["longitude"],
                geometry=f.get("geometry"),
                properties=desired_props,
                reliability=ReliabilityMode.DEMO,
            )
            session.add(mf)
            existing_records[name] = mf
            modified = True

    # Purge legacy orphan features that are not in the canonical list
    for name, mf in list(existing_records.items()):
        if name not in demo_names:
            await session.delete(mf)
            modified = True

    if modified:
        await session.commit()


def user_can_view_feature(user_role: str, properties: Dict[str, Any]) -> bool:
    """
    Evaluates server-side authorization for a spatial feature.
    Restricted defense and classified zones are strictly prohibited for tourist/general roles.
    """
    allowed_roles = properties.get("allowed_roles", ["*"])
    if "*" in allowed_roles:
        return True
    if user_role in allowed_roles:
        return True
    if user_role in [UserRoleEnum.AUTHORITY.value, UserRoleEnum.DISASTER_MANAGEMENT.value]:
        return True
    return False


@router.get("/map-layers")
async def get_map_layers(
    bbox: Optional[str] = Query(
        None,
        description="Bounding box: min_lon,min_lat,max_lon,max_lat (e.g. 84.0,19.0,86.5,20.5)",
    ),
    types: Optional[str] = Query(
        None,
        description="Comma-separated feature types to filter (e.g. beach,poi,risk_zone)",
    ),
    region: Optional[str] = Query(
        None,
        description="Optional coastal region_id filter (e.g. goa, maharashtra, odisha)",
    ),
    user_info: tuple[str, str] = Depends(get_optional_user_and_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch spatial layers for the Monitor screen viewport.
    Enforces server-side role filtering so tourists never receive sensitive layers.
    """
    user_id, user_role = user_info
    await ensure_demo_features_seeded(db)

    # Parse bounding box if provided
    parsed_bbox = None
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(",")]
            if len(parts) == 4:
                parsed_bbox = {
                    "min_lon": parts[0],
                    "min_lat": parts[1],
                    "max_lon": parts[2],
                    "max_lat": parts[3],
                }
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid bbox format. Expected 'min_lon,min_lat,max_lon,max_lat'",
            )

    # Parse feature types filter
    allowed_types = [t.strip() for t in types.split(",")] if types else None

    # Fetch features from DB
    stmt = select(MapFeature)
    if allowed_types:
        stmt = stmt.where(MapFeature.feature_type.in_(allowed_types))
    result = await db.execute(stmt)
    all_features = result.scalars().all()

    # Filter by bounding box, region & server-side authorization
    grouped_layers: Dict[str, List[Dict[str, Any]]] = {
        "beaches": [],
        "pois": [],
        "protected_areas": [],
        "restricted_areas": [],
        "activity_zones": [],
        "risk_zones": [],
    }

    filtered_count = 0
    for mf in all_features:
        props = mf.properties or {}

        # 1. Server-side role authorization check
        if not user_can_view_feature(user_role, props):
            continue

        # 2. Region filter if requested
        if region and region != "all":
            if props.get("region_id") != region:
                continue

        # 3. Viewport Bbox check
        if parsed_bbox:
            if not bbox_intersects(
                lat=mf.latitude,
                lon=mf.longitude,
                geometry=mf.geometry,
                min_lon=parsed_bbox["min_lon"],
                min_lat=parsed_bbox["min_lat"],
                max_lon=parsed_bbox["max_lon"],
                max_lat=parsed_bbox["max_lat"],
            ):
                continue

        feature_dict = {
            "id": mf.id,
            "name": mf.name,
            "feature_type": mf.feature_type,
            "latitude": mf.latitude,
            "longitude": mf.longitude,
            "geometry": mf.geometry,
            "properties": props,
            "reliability": mf.reliability.value if hasattr(mf.reliability, "value") else str(mf.reliability),
        }

        # Bucket into corresponding layer list
        if mf.feature_type == "beach":
            layer_key = "beaches"
        elif mf.feature_type.endswith("s"):
            layer_key = mf.feature_type
        else:
            layer_key = f"{mf.feature_type}s"
        grouped_layers.setdefault(layer_key, []).append(feature_dict)

        filtered_count += 1

    return {
        "layers": grouped_layers,
        "total_features": filtered_count,
        "requesting_user_role": user_role,
        "bbox": parsed_bbox,
        "data_mode": "DEMO",
        "attribution": "Survey of India / Odisha CZMA / INCOIS Coastal Telemetry (Demo)",
    }


@router.get("/spatial/nearby")
async def get_nearby_features(
    latitude: float = Query(..., description="Latitude coordinate"),
    longitude: float = Query(..., description="Longitude coordinate"),
    radius_km: float = Query(25.0, description="Search radius in km"),
    feature_type: Optional[str] = Query(None, description="Optional feature_type filter"),
    user_info: tuple[str, str] = Depends(get_current_user_and_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns coastal features sorted by radial proximity from the specified coordinate.
    """
    user_id, user_role = user_info
    await ensure_demo_features_seeded(db)

    stmt = select(MapFeature)
    if feature_type:
        stmt = stmt.where(MapFeature.feature_type == feature_type)
    res = await db.execute(stmt)
    features = res.scalars().all()

    nearby = []
    for mf in features:
        props = mf.properties or {}
        if not user_can_view_feature(user_role, props):
            continue

        dist = haversine_distance_km(latitude, longitude, mf.latitude, mf.longitude)
        if dist <= radius_km:
            nearby.append({
                "id": mf.id,
                "name": mf.name,
                "feature_type": mf.feature_type,
                "latitude": mf.latitude,
                "longitude": mf.longitude,
                "distance_km": dist,
                "properties": props,
            })

    nearby.sort(key=lambda x: x["distance_km"])
    return {
        "origin": {"latitude": latitude, "longitude": longitude},
        "radius_km": radius_km,
        "count": len(nearby),
        "results": nearby,
    }


@router.post("/spatial/check-containment")
async def check_containment(
    payload: Dict[str, float],
    user_info: tuple[str, str] = Depends(get_current_user_and_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Point-in-polygon check: Determines if a coordinate lies inside any protected sanctuary,
    commercial shipping fairway, or severe breaker hazard zone.
    """
    lat = payload.get("latitude")
    lon = payload.get("longitude")
    if lat is None or lon is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload must include 'latitude' and 'longitude'.",
        )

    user_id, user_role = user_info
    await ensure_demo_features_seeded(db)

    res = await db.execute(
        select(MapFeature).where(
            MapFeature.feature_type.in_(["protected_area", "restricted_area", "risk_zone"])
        )
    )
    zones = res.scalars().all()

    contained_features = []
    warnings = []
    inside_any = False

    for z in zones:
        props = z.properties or {}
        if not user_can_view_feature(user_role, props):
            continue

        if z.geometry and point_in_geometry(lat, lon, z.geometry):
            inside_any = True
            contained_features.append({
                "id": z.id,
                "name": z.name,
                "feature_type": z.feature_type,
                "properties": props,
            })
            if props.get("warning"):
                warnings.append(props["warning"])
            elif props.get("restriction"):
                warnings.append(props["restriction"])

    return {
        "point": {"latitude": lat, "longitude": lon},
        "is_inside_restricted_or_hazard_zone": inside_any,
        "contained_zones": contained_features,
        "warnings": list(set(warnings)),
    }


@router.get("/spatial/more-suitable")
async def get_more_suitable_locations(
    latitude: float = Query(19.26, description="Current latitude"),
    longitude: float = Query(84.90, description="Current longitude"),
    activity: str = Query("beach_visit", description="Desired tourist activity"),
    radius_km: float = Query(50.0, description="Search radius for alternatives in km"),
    user_info: tuple[str, str] = Depends(get_current_user_and_role),
    db: AsyncSession = Depends(get_db),
):
    """
    Rank nearby coastal beaches and POIs using the deterministic Activity Suitability Engine.
    Returns ranked alternatives if conditions at current location are suboptimal.
    """
    user_id, user_role = user_info
    await ensure_demo_features_seeded(db)

    # 1. Fetch nearby beaches and tourism zones
    res = await db.execute(
        select(MapFeature).where(
            MapFeature.feature_type.in_(["beach", "activity_zone", "poi"])
        )
    )
    features = res.scalars().all()

    ranked_alternatives = []
    for mf in features:
        props = mf.properties or {}
        if not user_can_view_feature(user_role, props):
            continue

        dist = haversine_distance_km(latitude, longitude, mf.latitude, mf.longitude)
        if dist > radius_km:
            continue

        # Evaluate suitability using deterministic physical engine
        # Blue Flag beaches have calm, patrolled conditions
        is_blue_flag = "Blue Flag" in mf.name
        is_sheltered = "Sheltered" in mf.name or props.get("shelter_rating")

        # Simulate localized microclimate variance for known locations
        wave_est = 0.8 if is_sheltered else (1.2 if is_blue_flag else 1.8)
        wind_est = 14.0 if is_sheltered else 18.0

        eval_result = evaluate_activity_suitability(
            activity=activity,
            weather={"wind_speed_kmh": wind_est, "weather_description": "Clear sky"},
            ocean={"wave_height_m": wave_est},
            gis={"nearby_pois": [{"name": mf.name, "distance_km": dist}]},
        )

        ranked_alternatives.append({
            "id": mf.id,
            "name": mf.name,
            "feature_type": mf.feature_type,
            "latitude": mf.latitude,
            "longitude": mf.longitude,
            "distance_km": dist,
            "suitability": eval_result["suitability"],
            "score": eval_result["score"],
            "summary": eval_result["summary"],
            "best_time_window": eval_result["best_time_window"],
            "amenities": props.get("amenities", []),
        })

    # Sort descending by suitability score, then ascending by distance
    ranked_alternatives.sort(key=lambda x: (-x["score"], x["distance_km"]))

    return {
        "current_location": {"latitude": latitude, "longitude": longitude},
        "activity": activity,
        "search_radius_km": radius_km,
        "recommendations": ranked_alternatives,
    }
