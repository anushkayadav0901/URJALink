"""
Geometry utility functions for polygon area calculations on Earth's surface.
"""

from math import radians, sin, cos, sqrt, atan2
from typing import List


def calculate_polygon_area_sqft(coordinates: List[List[float]]) -> float:
    """
    Calculate the area of a polygon on Earth's surface in square feet.

    Uses the Spherical Excess formula to account for Earth's curvature.
    More accurate than planar calculations for larger areas.

    Args:
        coordinates: List of [latitude, longitude] pairs defining the polygon.
                    Must have at least 3 points. Points should be in order
                    (clockwise or counter-clockwise).

    Returns:
        Area in square feet.

    Raises:
        ValueError: If fewer than 3 coordinates provided.
    """
    if len(coordinates) < 3:
        raise ValueError("Polygon must have at least 3 points")

    # Earth's radius in feet (mean radius)
    EARTH_RADIUS_FT = 20902231.0  # ~6371 km in feet

    # Convert coordinates to radians and close the polygon
    points = [(radians(lat), radians(lng)) for lat, lng in coordinates]
    if points[0] != points[-1]:
        points.append(points[0])  # Close the polygon

    # Calculate area using Spherical Excess formula
    # Area = R² * E, where E is the spherical excess
    area = 0.0

    for i in range(len(points) - 1):
        lat1, lon1 = points[i]
        lat2, lon2 = points[i + 1]

        # Use the trapezoid formula for small polygons on a sphere
        area += (lon2 - lon1) * (2 + sin(lat1) + sin(lat2))

    area = abs(area * EARTH_RADIUS_FT * EARTH_RADIUS_FT / 2.0)

    return area


def haversine_distance_ft(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth in feet.

    Args:
        lat1, lon1: First point coordinates (degrees)
        lat2, lon2: Second point coordinates (degrees)

    Returns:
        Distance in feet.
    """
    EARTH_RADIUS_FT = 20902231.0

    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return EARTH_RADIUS_FT * c


def validate_polygon(coordinates: List[List[float]]) -> bool:
    """
    Validate that polygon coordinates are reasonable.

    Args:
        coordinates: List of [latitude, longitude] pairs

    Returns:
        True if valid, False otherwise.
    """
    if len(coordinates) < 3:
        return False

    # Check that all coordinates are within valid ranges
    for lat, lng in coordinates:
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return False

    # Check that polygon isn't too small (< 100 sqft) or too large (> 1M sqft)
    try:
        area = calculate_polygon_area_sqft(coordinates)
        if area < 100 or area > 1_000_000:
            return False
    except Exception:
        return False

    return True
