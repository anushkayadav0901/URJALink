import asyncio
from typing import Dict, Tuple

import httpx

from core.constants import COORD_ROUNDING_PRECISION, NASA_CACHE_MAX_SIZE

# Simple in-memory cache keyed by rounded lat/lng tuples
_NASA_CACHE: Dict[Tuple[float, float], dict] = {}
_CACHE_LOCK = asyncio.Lock()


async def get_nasa_solar_data(lat: float, lng: float) -> dict:
    """Fetch solar irradiance data from NASA POWER API"""
    url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    
    params = {
        "parameters": "ALLSKY_SFC_SW_DWN,T2M",
        "community": "RE",
        "longitude": lng,
        "latitude": lat,
        "format": "JSON"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, timeout=15.0)
    
    if response.status_code != 200:
        raise Exception(f"NASA POWER API error: {response.status_code}")
    
    return response.json()


def process_nasa_data(nasa_response: dict) -> dict:
    """Extract relevant solar data from NASA response"""
    params = nasa_response['properties']['parameter']
    
    # Get annual average irradiance (kWh/m²/day)
    irradiance_data = params['ALLSKY_SFC_SW_DWN']
    peak_sun_hours_daily = irradiance_data['ANN']
    
    # Convert to kWh/m²/year
    annual_irradiance_kwh_m2 = peak_sun_hours_daily * 365
    
    # Calculate seasonal variation
    summer_avg = (irradiance_data['JUN'] + irradiance_data['JUL'] + 
                  irradiance_data['AUG']) / 3
    winter_avg = (irradiance_data['DEC'] + irradiance_data['JAN'] + 
                  irradiance_data['FEB']) / 3
    
    return {
        "peak_sun_hours_daily": round(peak_sun_hours_daily, 2),
        "annual_irradiance_kwh_m2": round(annual_irradiance_kwh_m2, 1),
        "seasonal_variation": {
            "summer_sun_hours": round(summer_avg, 2),
            "winter_sun_hours": round(winter_avg, 2)
        }
    }


async def get_nasa_data_cached(lat: float, lng: float) -> dict:
    """Get NASA data with deterministic caching keyed by rounded coordinates."""
    key = (round(lat, COORD_ROUNDING_PRECISION), round(lng, COORD_ROUNDING_PRECISION))
    
    async with _CACHE_LOCK:
        cached = _NASA_CACHE.get(key)
    
    if cached is not None:
        return cached
    
    nasa_response = await get_nasa_solar_data(lat, lng)
    processed = process_nasa_data(nasa_response)
    
    async with _CACHE_LOCK:
        if len(_NASA_CACHE) >= NASA_CACHE_MAX_SIZE:
            _NASA_CACHE.pop(next(iter(_NASA_CACHE)))
        _NASA_CACHE[key] = processed
    
    return processed
