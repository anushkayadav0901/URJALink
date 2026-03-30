from typing import List

from core.constants import (
    DEFAULT_ROOF_CONFIDENCE,
    ESTIMATED_ROOF_TOTAL_AREA_SQFT,
    USABLE_AREA_RATIO,
    USER_POLYGON_CONFIDENCE,
)
from core.geometry import calculate_polygon_area_sqft, validate_polygon
from core.numeric import quantize
from core.panels import calculate_panel_capacity


def get_estimated_roof_data(lat: float, lng: float) -> dict:
    """
    Return estimated roof data for MVP
    Based on typical US residential home
    """
    # Typical single-family home roof
    total_area_sqft = ESTIMATED_ROOF_TOTAL_AREA_SQFT
    usable_area_sqft = quantize(total_area_sqft * USABLE_AREA_RATIO, 1)
    panel_capacity = calculate_panel_capacity(usable_area_sqft)
    
    return {
        "total_area_sqft": total_area_sqft,
        "usable_area_sqft": usable_area_sqft,
        "roof_segments": [
            {
                "segment_id": 1,
                "area_sqft": total_area_sqft,
                "orientation_degrees": 180,  # South-facing (best case)
                "orientation_cardinal": "south",
                "tilt_degrees": 25,  # Typical pitched roof
                "panel_capacity": panel_capacity
            }
        ],
        "obstacles": {
            "chimneys": 0,
            "skylights": 0,
            "trees_nearby": False,
            "hvac_units": 0
        },
        "confidence_score": DEFAULT_ROOF_CONFIDENCE  # Lower confidence = estimated
    }


def get_roof_data_from_polygon(
    polygon_coords: List[List[float]],
    lat: float,
    lng: float
) -> dict:
    """
    Calculate roof data from user-drawn polygon coordinates.
    
    Args:
        polygon_coords: List of [latitude, longitude] pairs defining the roof boundary
        lat: Center latitude for reference
        lng: Center longitude for reference
    
    Returns:
        Dictionary containing roof analysis data
    
    Raises:
        ValueError: If polygon is invalid
    """
    # Validate polygon
    if not validate_polygon(polygon_coords):
        raise ValueError(
            "Invalid polygon: must have at least 3 points and reasonable area (100-1M sqft)"
        )
    
    # Calculate total area from polygon
    total_area_sqft = calculate_polygon_area_sqft(polygon_coords)
    
    # Apply usability factor (assume 85% usable for solar panels)
    # Account for roof edges, obstacles, maintenance access
    usable_area_sqft = quantize(total_area_sqft * USABLE_AREA_RATIO, 1)
    
    # Calculate panel capacity with layout efficiency (fire setbacks, walkways)
    panel_capacity = calculate_panel_capacity(usable_area_sqft)
    
    # Estimate orientation based on polygon shape
    # For MVP, assume optimal south-facing orientation
    # TODO: Calculate actual orientation from polygon geometry
    orientation_degrees = 180  # South
    orientation_cardinal = "south"
    
    # Assume typical pitched roof tilt
    tilt_degrees = 25
    
    return {
        "total_area_sqft": quantize(total_area_sqft, 1),
        "usable_area_sqft": usable_area_sqft,
        "roof_segments": [
            {
                "segment_id": 1,
                "area_sqft": quantize(total_area_sqft, 1),
                "orientation_degrees": orientation_degrees,
                "orientation_cardinal": orientation_cardinal,
                "tilt_degrees": tilt_degrees,
                "panel_capacity": panel_capacity,
                "polygon": {
                    "coordinates": polygon_coords,
                    "area_sqft": quantize(total_area_sqft, 1),
                    "confidence": 0.95  # High confidence for user-drawn
                }
            }
        ],
        "obstacles": {
            "chimneys": 0,
            "skylights": 0,
            "trees_nearby": False,
            "hvac_units": 0
        },
        "confidence_score": USER_POLYGON_CONFIDENCE  # High confidence = user-defined
    }
