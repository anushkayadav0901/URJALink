"""Assemble live economic inputs using free public data sources."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Optional

import httpx

from core.config import settings
from models.economics import EconomicInputs
from data_access.country_detector import detect_country, detect_indian_state
from data_access.india_economic_data import fetch_india_economic_inputs

EIA_ENDPOINT = "https://api.eia.gov/v2/electricity/retail-sales/data/"
INSTALL_COST_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "install_costs_2024.json"
)


class EconomicDataError(RuntimeError):
    """Raised when economic inputs cannot be derived."""


def _ensure_state(state: Optional[str]) -> str:
    if not state:
        raise EconomicDataError(
            "State code is required to fetch live electric rates. "
            "Pass request.state (USPS abbreviation) when calling /api/v1/analyze."
        )
    return state.upper()


async def _fetch_electricity_rate_usd_per_kwh(state: str) -> float:
    if not settings.EIA_API_KEY:
        raise EconomicDataError(
            "EIA_API_KEY is not configured. Request a free key from https://www.eia.gov/opendata/."
        )

    params = {
        "frequency": "monthly",
        "data[0]": "price",
        "facets[stateid][]": state,
        "facets[sectorid][]": "RES",
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "offset": 0,
        "length": 1,
        "api_key": settings.EIA_API_KEY,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(EIA_ENDPOINT, params=params)

    if response.status_code != 200:
        raise EconomicDataError(
            f"EIA API error ({response.status_code}): {response.text}"
        )

    body = response.json()
    try:
        data = body["response"]["data"]
        if not data:
            raise KeyError("response.data empty")
        cents_per_kwh = float(data[0]["price"])
    except (KeyError, ValueError) as exc:
        raise EconomicDataError(
            f"Unable to parse EIA payload for state {state}: {body}"
        ) from exc

    return round(cents_per_kwh / 100.0, 4)


def _load_install_cost_table() -> Dict[str, float]:
    if not INSTALL_COST_PATH.exists():
        raise EconomicDataError(
            f"Install cost dataset missing at {INSTALL_COST_PATH}. "
            "Add a JSON file derived from the latest LBNL 'Tracking the Sun' release."
        )
    with INSTALL_COST_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


INSTALL_COST_TABLE = _load_install_cost_table()

STATE_MAINTENANCE_PROFILE: Dict[str, Dict[str, float]] = {
    # Rates derived from public NOAA precipitation normals + industry O&M surveys.
    "AZ": {"maintenance_rate": 0.010, "cleanings": 4, "cleaning_cost_per_kw": 18.0},
    "CA": {"maintenance_rate": 0.011, "cleanings": 3, "cleaning_cost_per_kw": 16.0},
    "CO": {"maintenance_rate": 0.010, "cleanings": 3, "cleaning_cost_per_kw": 15.0},
    "FL": {"maintenance_rate": 0.013, "cleanings": 2, "cleaning_cost_per_kw": 14.0},
    "MA": {"maintenance_rate": 0.012, "cleanings": 2, "cleaning_cost_per_kw": 13.0},
    "NJ": {"maintenance_rate": 0.012, "cleanings": 2, "cleaning_cost_per_kw": 13.5},
    "NY": {"maintenance_rate": 0.013, "cleanings": 2, "cleaning_cost_per_kw": 14.5},
    "TX": {"maintenance_rate": 0.011, "cleanings": 3, "cleaning_cost_per_kw": 15.5},
    "WA": {"maintenance_rate": 0.013, "cleanings": 1, "cleaning_cost_per_kw": 12.0},
    "DEFAULT": {
        "maintenance_rate": 0.012,
        "cleanings": 2,
        "cleaning_cost_per_kw": 14.0,
    },
}


def _resolve_install_cost(state: str) -> float:
    return float(INSTALL_COST_TABLE.get(state, INSTALL_COST_TABLE["US"]))


def _resolve_maintenance_profile(state: str) -> Dict[str, float]:
    return STATE_MAINTENANCE_PROFILE.get(state, STATE_MAINTENANCE_PROFILE["DEFAULT"])


async def fetch_us_economic_inputs(
    latitude: float,
    longitude: float,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
) -> EconomicInputs:
    """Fetch US-specific economic inputs (EIA rates, USD)."""
    _ = latitude, longitude, zip_code  # currently unused but kept for signature parity
    state_code = _ensure_state(state)

    electricity_rate = await _fetch_electricity_rate_usd_per_kwh(state_code)
    install_cost = _resolve_install_cost(state_code)
    profile = _resolve_maintenance_profile(state_code)

    return EconomicInputs(
        electricity_rate_per_kwh=electricity_rate,
        install_cost_per_watt=install_cost,
        annual_maintenance_rate=profile["maintenance_rate"],
        dust_cleanings_per_year=int(profile["cleanings"]),
        dust_cleaning_cost_per_kw=profile["cleaning_cost_per_kw"],
        currency="USD",
        country="US",
    )


async def fetch_economic_inputs(
    latitude: float,
    longitude: float,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    country: Optional[str] = None,
) -> EconomicInputs:
    """Fetch electricity rate, install costs, and maintenance assumptions.

    Routes to the appropriate country-specific provider based on
    the ``country`` parameter or auto-detected from coordinates.
    """
    if country is None:
        country = detect_country(latitude, longitude)

    if country == "IN":
        # For India, auto-detect state from coordinates if not provided
        indian_state = state or detect_indian_state(latitude, longitude)
        return await fetch_india_economic_inputs(
            latitude=latitude,
            longitude=longitude,
            state=indian_state,
        )

    # Default: US
    return await fetch_us_economic_inputs(
        latitude=latitude,
        longitude=longitude,
        state=state,
        zip_code=zip_code,
    )
