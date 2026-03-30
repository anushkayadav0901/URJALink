import httpx
import os
import math
from core.config import settings


async def fetch_satellite_image(lat: float, lng: float, zoom: int = 20) -> bytes:
    """Fetch satellite image from Google Maps Static API"""
    url = "https://maps.googleapis.com/maps/api/staticmap"

    params = {
        "center": f"{lat},{lng}",
        "zoom": zoom,
        "size": "640x640",
        "maptype": "satellite",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=10.0)

    if response.status_code != 200:
        raise Exception(f"Google Maps API error: {response.status_code}")

    return response.content


def calculate_meters_per_pixel(latitude: float, zoom: int) -> float:
    """
    Calculate meters per pixel for Google Maps at given latitude and zoom
    This is critical for accurate area calculations
    """
    lat_radians = math.radians(latitude)
    meters_per_pixel = (156543.03392 * math.cos(lat_radians)) / (2**zoom)
    return meters_per_pixel


def pixel_to_latlng(
    pixel_x: int,
    pixel_y: int,
    center_lat: float,
    center_lng: float,
    zoom: int,
    image_width: int = 640,
    image_height: int = 640,
) -> tuple:
    """
    Convert pixel coordinates to lat/lng coordinates
    Used to convert roof mask pixels to Google Maps coordinates
    """
    # Calculate meters per pixel
    meters_per_pixel = calculate_meters_per_pixel(center_lat, zoom)

    # Calculate offset from center in pixels
    pixel_offset_x = pixel_x - (image_width / 2)
    pixel_offset_y = (image_height / 2) - pixel_y  # Y is flipped in images

    # Convert to meters offset
    meters_offset_x = pixel_offset_x * meters_per_pixel
    meters_offset_y = pixel_offset_y * meters_per_pixel

    # Convert meters to lat/lng offset
    # 1 degree latitude ≈ 111,111 meters
    # 1 degree longitude ≈ 111,111 * cos(latitude) meters
    lat_offset = meters_offset_y / 111111.0
    lng_offset = meters_offset_x / (111111.0 * math.cos(math.radians(center_lat)))

    # Calculate final coordinates
    final_lat = center_lat + lat_offset
    final_lng = center_lng + lng_offset

    return final_lat, final_lng
