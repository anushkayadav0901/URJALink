"""
Area-level solar sweet-spot analysis.

Given an area name (e.g. "Dwarka Sector 3, Delhi"):
1. Geocode the query to obtain a viewport bounding box.
2. Sample an NxN grid of points inside the viewport.
3. For each point, call the Google Solar API `buildingInsights:findClosest`.
4. Rank results by solar potential and return the sweet spots.
"""

import asyncio
from typing import Dict, List, Optional

import httpx

from core.config import settings


async def geocode_area(query: str) -> Dict:
    """
    Use Google Places API (New) Text Search to convert an area name
    to a viewport bounding box.

    Returns dict with keys: ne_lat, ne_lng, sw_lat, sw_lng, center_lat, center_lng
    """
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.location,places.viewport",
        "Referer": "http://localhost:8081/",
    }
    body = {"textQuery": query, "maxResultCount": 1}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=body, headers=headers, timeout=10.0)

    if response.status_code != 200:
        raise RuntimeError(f"Places API error: {response.status_code} - {response.text}")

    data = response.json()
    places = data.get("places", [])

    if not places:
        raise ValueError(f"Could not find area '{query}'")

    place = places[0]
    location = place.get("location", {})

    vp = place.get("viewport")
    if not vp:
        # Point result – create a small bounding box (~500m) around it
        lat = location.get("latitude", 0)
        lng = location.get("longitude", 0)
        delta = 0.005
        return {
            "ne_lat": lat + delta,
            "ne_lng": lng + delta,
            "sw_lat": lat - delta,
            "sw_lng": lng - delta,
            "center_lat": lat,
            "center_lng": lng,
        }

    return {
        "ne_lat": vp["high"]["latitude"],
        "ne_lng": vp["high"]["longitude"],
        "sw_lat": vp["low"]["latitude"],
        "sw_lng": vp["low"]["longitude"],
        "center_lat": (vp["high"]["latitude"] + vp["low"]["latitude"]) / 2,
        "center_lng": (vp["high"]["longitude"] + vp["low"]["longitude"]) / 2,
    }


def _generate_grid_points(
    bounds: Dict, grid_size: int
) -> List[Dict[str, float]]:
    """Generate grid_size x grid_size evenly spaced lat/lng points inside bounds."""
    points = []
    lat_step = (bounds["ne_lat"] - bounds["sw_lat"]) / (grid_size + 1)
    lng_step = (bounds["ne_lng"] - bounds["sw_lng"]) / (grid_size + 1)

    for i in range(1, grid_size + 1):
        for j in range(1, grid_size + 1):
            points.append(
                {
                    "lat": bounds["sw_lat"] + i * lat_step,
                    "lng": bounds["sw_lng"] + j * lng_step,
                }
            )
    return points


async def _fetch_building_insights(
    lat: float, lng: float, client: httpx.AsyncClient
) -> Optional[Dict]:
    """
    Call Google Solar API buildingInsights:findClosest for a single point.
    Returns the parsed JSON or None if no building is found.
    """
    url = "https://solar.googleapis.com/v1/buildingInsights:findClosest"
    params = {
        "location.latitude": lat,
        "location.longitude": lng,
        "requiredQuality": "LOW",
        "key": settings.GOOGLE_MAPS_API_KEY,
    }
    headers = {"Referer": "http://localhost:8081/"}

    try:
        resp = await client.get(url, params=params, headers=headers, timeout=15.0)
        if resp.status_code == 404:
            return None
        if resp.status_code != 200:
            return None
        return resp.json()
    except Exception:
        return None


def _score_building(data: Dict) -> Optional[Dict]:
    """
    Extract and score a building from Google Solar API response.
    Returns a flat dict with the fields needed for SolarSpot, or None.
    """
    sp = data.get("solarPotential")
    if not sp:
        return None

    center = data.get("center", {})
    max_panels = sp.get("maxArrayPanelsCount", 0)
    if max_panels == 0:
        return None

    roof_area = sp.get("maxArrayAreaMeters2", 0)
    sunshine = sp.get("maxSunshineHoursPerYear", 0)
    carbon_factor = sp.get("carbonOffsetFactorKgPerMwh", 0)

    # Best panel config = last entry (maximum panels)
    configs = sp.get("solarPanelConfigs", [])
    yearly_kwh = 0.0
    if configs:
        best = configs[-1]
        yearly_kwh = best.get("yearlyEnergyDcKwh", 0)

    # Carbon offset: yearly_kwh / 1000 * factor
    carbon_kg = (yearly_kwh / 1000) * carbon_factor if carbon_factor else 0

    # Simple 0-100 score: weighted combination of sunshine, roof area, panels
    sunshine_score = min(sunshine / 2000, 1.0) * 40
    area_score = min(roof_area / 300, 1.0) * 30
    panel_score = min(max_panels / 50, 1.0) * 30
    solar_score = int(round(sunshine_score + area_score + panel_score))

    return {
        "latitude": center.get("latitude", 0),
        "longitude": center.get("longitude", 0),
        "solar_score": min(solar_score, 100),
        "max_panels": max_panels,
        "roof_area_m2": round(roof_area, 1),
        "sunshine_hours_per_year": round(sunshine, 1),
        "yearly_energy_kwh": round(yearly_kwh, 1),
        "carbon_offset_kg_per_year": round(carbon_kg, 1),
        "imagery_quality": data.get("imageryQuality"),
    }


async def analyze_area(query: str, grid_size: int = 4) -> Dict:
    """
    Main orchestrator: geocode → grid → Solar API → rank → return.
    """
    # 1. Geocode
    bounds = await geocode_area(query)

    # 2. Generate grid
    points = _generate_grid_points(bounds, grid_size)

    # 3. Fetch building insights concurrently (with connection pooling)
    async with httpx.AsyncClient() as client:
        tasks = [
            _fetch_building_insights(p["lat"], p["lng"], client) for p in points
        ]
        results = await asyncio.gather(*tasks)

    # 4. Score and filter
    spots = []
    seen_buildings = set()
    for raw in results:
        if raw is None:
            continue
        scored = _score_building(raw)
        if scored is None:
            continue
        # Deduplicate by building name (same building returned for nearby points)
        building_key = raw.get("name", "")
        if building_key and building_key in seen_buildings:
            continue
        if building_key:
            seen_buildings.add(building_key)
        spots.append(scored)

    # 5. Rank by solar_score descending
    spots.sort(key=lambda s: s["solar_score"], reverse=True)

    best = spots[0] if spots else None

    return {
        "query": query,
        "bounds": {
            "ne_lat": bounds["ne_lat"],
            "ne_lng": bounds["ne_lng"],
            "sw_lat": bounds["sw_lat"],
            "sw_lng": bounds["sw_lng"],
        },
        "total_points_sampled": len(points),
        "spots": spots,
        "best_spot": best,
    }
