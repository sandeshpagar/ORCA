"""
Spatial Geometry Utilities — ORCA (Phase 3)
Pure-Python spatial algorithms supporting both in-memory SQLite (tests)
and PostgreSQL/PostGIS environments with 100% mathematical reproducibility.
"""

import math
from typing import Tuple, List, Dict, Any, Optional

EARTH_RADIUS_KM = 6371.0088


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two points on the Earth's surface (WGS84 sphere) in kilometers.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 3)


def point_in_polygon(lat: float, lon: float, polygon_coords: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to determine if a point (lat, lon) is inside a 2D polygon.
    polygon_coords: List of GeoJSON vertices [[lon, lat], [lon, lat], ...]
    """
    if len(polygon_coords) < 3:
        return False

    inside = False
    n = len(polygon_coords)
    p1_lon, p1_lat = polygon_coords[0][0], polygon_coords[0][1]

    for i in range(1, n + 1):
        p2_lon, p2_lat = polygon_coords[i % n][0], polygon_coords[i % n][1]

        # Check if ray crosses the line segment
        if min(p1_lat, p2_lat) < lat <= max(p1_lat, p2_lat):
            if lon <= max(p1_lon, p2_lon):
                if p1_lat != p2_lat:
                    x_inters = (lat - p1_lat) * (p2_lon - p1_lon) / (p2_lat - p1_lat) + p1_lon
                else:
                    x_inters = p1_lon
                if p1_lon == p2_lon or lon <= x_inters:
                    inside = not inside

        p1_lon, p1_lat = p2_lon, p2_lat

    return inside


def point_in_geometry(lat: float, lon: float, geometry: Optional[Dict[str, Any]]) -> bool:
    """
    Determines if point is inside a GeoJSON geometry (Polygon or MultiPolygon).
    """
    if not geometry:
        return False

    geom_type = geometry.get("type")
    coords = geometry.get("coordinates", [])

    if geom_type == "Polygon":
        # First ring is the exterior boundary
        if coords and len(coords) > 0:
            return point_in_polygon(lat, lon, coords[0])
    elif geom_type == "MultiPolygon":
        for poly in coords:
            if poly and len(poly) > 0:
                if point_in_polygon(lat, lon, poly[0]):
                    return True
    elif geom_type == "Point":
        p_lon, p_lat = coords[0], coords[1]
        return haversine_distance_km(lat, lon, p_lat, p_lon) <= 0.05  # within 50m

    return False


def bbox_intersects(
    lat: float,
    lon: float,
    geometry: Optional[Dict[str, Any]],
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
) -> bool:
    """
    Determines if a feature's point or geometry intersects a bounding box [min_lon, min_lat, max_lon, max_lat].
    """
    # 1. Point check
    if min_lon <= lon <= max_lon and min_lat <= lat <= max_lat:
        return True

    # 2. Geometry check (if polygon vertices fall inside bbox or contain bbox centroid)
    if geometry and geometry.get("type") == "Polygon":
        coords = geometry.get("coordinates", [[]])[0]
        for vertex in coords:
            v_lon, v_lat = vertex[0], vertex[1]
            if min_lon <= v_lon <= max_lon and min_lat <= v_lat <= max_lat:
                return True
        # Check if bbox center is inside the polygon
        center_lat = (min_lat + max_lat) / 2.0
        center_lon = (min_lon + max_lon) / 2.0
        if point_in_polygon(center_lat, center_lon, coords):
            return True

    return False
