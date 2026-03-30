"""Regression tests for geodesic roof area calculations."""
from __future__ import annotations

import math

import pytest

from core.geometry import calculate_polygon_area_sqft, haversine_distance_ft


def _feet_to_sqft(length_ft: float, width_ft: float) -> float:
    """Helper to keep unit conversions explicit inside the test."""
    return length_ft * width_ft


def test_equatorial_square_matches_haversine_product() -> None:
    """
    A tight square around the equator should yield the same area as
    multiplying the haversine-derived edge lengths (within ~2%).
    """
    # 0.0001 degrees is ~36 ft at the equator; polygon is ordered CCW.
    coords = [
        [0.0, 0.0],
        [0.0, 0.0001],
        [0.0001, 0.0001],
        [0.0001, 0.0],
    ]

    calculated_sqft = calculate_polygon_area_sqft(coords)

    north_south_ft = haversine_distance_ft(coords[0][0], coords[0][1], coords[2][0], coords[0][1])
    east_west_ft = haversine_distance_ft(coords[0][0], coords[0][1], coords[0][0], coords[1][1])
    expected_sqft = _feet_to_sqft(north_south_ft, east_west_ft)

    assert calculated_sqft == pytest.approx(expected_sqft, rel=0.02)


def test_midlatitude_rectangle_accounts_for_longitude_scale() -> None:
    """
    Mid-latitude rectangles should shrink east-west distances based on cos(latitude).
    This guards against inflated sq-ft results when processing US rooftops.
    """
    # Roughly Palo Alto, CA
    base_lat = 37.4
    delta = 0.0002  # ~72 ft in latitude, ~57 ft in longitude at this latitude
    coords = [
        [base_lat, -122.1],
        [base_lat, -122.1 + delta],
        [base_lat - delta, -122.1 + delta],
        [base_lat - delta, -122.1],
    ]

    calculated_sqft = calculate_polygon_area_sqft(coords)

    north_south_ft = haversine_distance_ft(base_lat, -122.1, base_lat - delta, -122.1)
    cos_lat = math.cos(math.radians(base_lat))
    # Convert longitude delta to feet: degrees -> radians -> feet on Earth's surface
    earth_radius_ft = 20902231.0
    east_west_ft = abs(delta) * math.pi / 180 * earth_radius_ft * cos_lat
    expected_sqft = _feet_to_sqft(north_south_ft, east_west_ft)

    assert calculated_sqft == pytest.approx(expected_sqft, rel=0.03)
