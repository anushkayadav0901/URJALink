"""Detect country from geographic coordinates using bounding-box checks.

No external API call needed — just simple lat/lng range tests.
Easily extensible to more countries later.
"""

from __future__ import annotations

from typing import Optional

# Bounding boxes: (min_lat, max_lat, min_lng, max_lng)
_COUNTRY_BOUNDS: dict[str, tuple[float, float, float, float]] = {
    "IN": (6.0, 37.0, 68.0, 98.0),      # India
    "US": (24.0, 50.0, -125.0, -66.0),   # Continental US
    "GB": (49.0, 61.0, -8.0, 2.0),       # United Kingdom
    "AU": (-44.0, -10.0, 113.0, 154.0),  # Australia
    "DE": (47.0, 55.5, 5.5, 15.5),       # Germany
    "JP": (24.0, 46.0, 122.0, 146.0),    # Japan
    "BR": (-34.0, 6.0, -74.0, -35.0),    # Brazil
    "CA": (41.0, 84.0, -141.0, -52.0),   # Canada
}

# US territories that fall outside continental bounds
_US_TERRITORIES_BOUNDS: list[tuple[float, float, float, float]] = [
    (17.5, 19.0, -68.0, -65.0),   # Puerto Rico / USVI
    (18.0, 22.5, -161.0, -154.0), # Hawaii
    (51.0, 72.0, -180.0, -130.0), # Alaska
]

DEFAULT_COUNTRY = "US"


def detect_country(latitude: float, longitude: float) -> str:
    """Return ISO 3166-1 alpha-2 country code for the given coordinates.

    Uses simple bounding-box containment checks.  Returns ``DEFAULT_COUNTRY``
    when no box matches.
    """
    for code, (min_lat, max_lat, min_lng, max_lng) in _COUNTRY_BOUNDS.items():
        if min_lat <= latitude <= max_lat and min_lng <= longitude <= max_lng:
            return code

    # Check US territories separately
    for min_lat, max_lat, min_lng, max_lng in _US_TERRITORIES_BOUNDS:
        if min_lat <= latitude <= max_lat and min_lng <= longitude <= max_lng:
            return "US"

    return DEFAULT_COUNTRY


def detect_indian_state(latitude: float, longitude: float) -> Optional[str]:
    """Return a rough Indian state code from coordinates.

    This uses simple regional bounding boxes.  It is intentionally
    approximate — the result is used only to look up state-average
    electricity tariffs, so perfect accuracy isn't critical.
    """
    # Rough bounding boxes for major Indian states/UTs
    _STATE_REGIONS: list[tuple[str, float, float, float, float]] = [
        # (code, min_lat, max_lat, min_lng, max_lng)
        ("DL", 28.4, 28.9, 76.8, 77.4),    # Delhi
        ("MH", 15.6, 22.0, 72.6, 80.9),    # Maharashtra
        ("KA", 11.5, 18.5, 74.0, 78.6),    # Karnataka
        ("TN", 8.0, 13.5, 76.2, 80.4),     # Tamil Nadu
        ("KL", 8.2, 12.8, 74.8, 77.4),     # Kerala
        ("AP", 12.6, 19.1, 76.8, 84.8),    # Andhra Pradesh
        ("TS", 15.8, 19.9, 77.2, 81.3),    # Telangana
        ("GJ", 20.1, 24.7, 68.2, 74.5),    # Gujarat
        ("RJ", 23.0, 30.2, 69.5, 78.3),    # Rajasthan
        ("UP", 23.9, 30.4, 77.1, 84.6),    # Uttar Pradesh
        ("MP", 21.1, 26.9, 74.0, 82.8),    # Madhya Pradesh
        ("WB", 21.5, 27.2, 86.0, 89.9),    # West Bengal
        ("BR", 24.3, 27.5, 83.3, 88.2),    # Bihar
        ("OR", 17.8, 22.6, 81.3, 87.5),    # Odisha (Orissa)
        ("PB", 29.5, 32.5, 73.9, 76.9),    # Punjab
        ("HR", 27.6, 30.9, 74.5, 77.6),    # Haryana
        ("UK", 28.7, 31.5, 77.6, 81.0),    # Uttarakhand
        ("HP", 30.4, 33.3, 75.6, 79.0),    # Himachal Pradesh
        ("JK", 32.2, 37.0, 73.7, 80.3),    # Jammu & Kashmir
        ("CG", 17.8, 24.1, 80.2, 84.4),    # Chhattisgarh
        ("JH", 21.9, 25.3, 83.3, 87.9),    # Jharkhand
        ("AS", 24.1, 28.0, 89.7, 96.0),    # Assam
        ("GA", 14.9, 15.8, 73.6, 74.5),    # Goa
    ]

    for code, min_lat, max_lat, min_lng, max_lng in _STATE_REGIONS:
        if min_lat <= latitude <= max_lat and min_lng <= longitude <= max_lng:
            return code

    # Default to Delhi if within India but no state matched
    return "DL"
