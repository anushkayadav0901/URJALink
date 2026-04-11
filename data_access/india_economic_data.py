"""Indian economic data provider for solar financial analysis.

Returns electricity rates (₹/kWh), install costs (₹/watt), and maintenance
profiles specific to Indian states.  All values are in INR.

Data sources:
- Electricity rates: NoBroker.in 2026 state-wise residential & commercial tariffs
  (CERC / state DISCOM published residential tariff slabs)
- Install costs: MNRE benchmark costs for residential rooftop solar (2024)
- Maintenance: Industry estimates adjusted for Indian labour rates
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from models.economics import EconomicInputs

_DATA_DIR = Path(__file__).resolve().parents[1] / "data"
_ELECTRICITY_RATES_PATH = _DATA_DIR / "india_electricity_rates.json"
_INSTALL_COSTS_PATH = _DATA_DIR / "india_install_costs.json"


def _load_json(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


# Load once at module import
INDIA_ELECTRICITY_RATES: Dict = _load_json(_ELECTRICITY_RATES_PATH)
INDIA_INSTALL_COSTS: Dict[str, float] = _load_json(_INSTALL_COSTS_PATH)

# Indian maintenance profiles per region type
# Rates are lower than US due to lower labour costs, but dust is worse
# in northern plains (more cleanings needed).
INDIA_MAINTENANCE_PROFILES: Dict[str, Dict[str, float]] = {
    # Dusty northern plains
    "RJ": {"maintenance_rate": 0.008, "cleanings": 6, "cleaning_cost_per_kw": 250.0},
    "DL": {"maintenance_rate": 0.009, "cleanings": 5, "cleaning_cost_per_kw": 300.0},
    "HR": {"maintenance_rate": 0.008, "cleanings": 5, "cleaning_cost_per_kw": 250.0},
    "UP": {"maintenance_rate": 0.008, "cleanings": 5, "cleaning_cost_per_kw": 200.0},
    "MP": {"maintenance_rate": 0.008, "cleanings": 5, "cleaning_cost_per_kw": 200.0},
    "GJ": {"maintenance_rate": 0.008, "cleanings": 5, "cleaning_cost_per_kw": 250.0},
    "PB": {"maintenance_rate": 0.008, "cleanings": 5, "cleaning_cost_per_kw": 250.0},
    # Moderate climate (south, west coast)
    "KA": {"maintenance_rate": 0.007, "cleanings": 3, "cleaning_cost_per_kw": 250.0},
    "MH": {"maintenance_rate": 0.008, "cleanings": 4, "cleaning_cost_per_kw": 300.0},
    "TN": {"maintenance_rate": 0.007, "cleanings": 3, "cleaning_cost_per_kw": 250.0},
    "KL": {"maintenance_rate": 0.007, "cleanings": 2, "cleaning_cost_per_kw": 300.0},
    "AP": {"maintenance_rate": 0.007, "cleanings": 3, "cleaning_cost_per_kw": 200.0},
    "TS": {"maintenance_rate": 0.007, "cleanings": 4, "cleaning_cost_per_kw": 250.0},
    "GA": {"maintenance_rate": 0.007, "cleanings": 2, "cleaning_cost_per_kw": 300.0},
    # Eastern / NE (humid, less dust but more rain soiling)
    "WB": {"maintenance_rate": 0.009, "cleanings": 3, "cleaning_cost_per_kw": 200.0},
    "OR": {"maintenance_rate": 0.008, "cleanings": 3, "cleaning_cost_per_kw": 200.0},
    "BR": {"maintenance_rate": 0.008, "cleanings": 4, "cleaning_cost_per_kw": 200.0},
    "AS": {"maintenance_rate": 0.009, "cleanings": 3, "cleaning_cost_per_kw": 250.0},
    "JH": {"maintenance_rate": 0.008, "cleanings": 4, "cleaning_cost_per_kw": 200.0},
    # Hill states
    "HP": {"maintenance_rate": 0.007, "cleanings": 2, "cleaning_cost_per_kw": 300.0},
    "UK": {"maintenance_rate": 0.007, "cleanings": 2, "cleaning_cost_per_kw": 300.0},
    "JK": {"maintenance_rate": 0.007, "cleanings": 2, "cleaning_cost_per_kw": 300.0},
    # Default
    "DEFAULT": {"maintenance_rate": 0.008, "cleanings": 4, "cleaning_cost_per_kw": 250.0},
}


def _parse_slabs(state_data: Dict) -> List[Tuple[int, Optional[int], float]]:
    """Parse slab data into list of (min_units, max_units, rate) tuples."""
    slabs = state_data.get("residential", {}).get("slabs", [])
    result = []
    for slab in slabs:
        result.append((slab["min"], slab.get("max"), slab["rate"]))
    return result


def calculate_effective_rate(
    state_code: str,
    monthly_consumption_kwh: int = 250,
    consumer_type: str = "residential",
) -> float:
    """Calculate the effective blended electricity rate for a given monthly consumption.

    For solar analysis, this represents the average ₹/kWh the consumer pays.
    Solar offsets units from the top slab down, so the marginal savings rate
    is typically higher than the blended average.

    Args:
        state_code: Indian state code (e.g., 'DL', 'MH')
        monthly_consumption_kwh: Average monthly household consumption in kWh
        consumer_type: 'residential' or 'commercial'

    Returns:
        Effective blended rate in ₹/kWh
    """
    state_data = INDIA_ELECTRICITY_RATES.get(state_code)
    if not state_data:
        state_data = INDIA_ELECTRICITY_RATES.get("IN", {})

    tariff_data = state_data.get(consumer_type, {})
    slabs = tariff_data.get("slabs", [])

    if not slabs:
        return tariff_data.get("effective_avg_rate", 5.50)

    total_cost = 0.0
    remaining = monthly_consumption_kwh

    for slab in slabs:
        slab_min = slab["min"]
        slab_max = slab.get("max")
        rate = slab["rate"]

        if slab_max is not None:
            slab_width = slab_max - slab_min + 1
            units_in_slab = min(remaining, slab_width)
        else:
            units_in_slab = remaining

        if units_in_slab <= 0:
            break

        total_cost += units_in_slab * rate
        remaining -= units_in_slab

        if remaining <= 0:
            break

    if monthly_consumption_kwh > 0:
        return round(total_cost / monthly_consumption_kwh, 2)
    return tariff_data.get("effective_avg_rate", 5.50)


def get_marginal_rate(
    state_code: str,
    monthly_consumption_kwh: int = 250,
    consumer_type: str = "residential",
) -> float:
    """Get the marginal electricity rate — the rate of the highest slab reached.

    This is the rate that solar panels effectively offset, since solar reduces
    consumption from the top slab down. This gives a more accurate savings
    projection than using the blended average.
    """
    state_data = INDIA_ELECTRICITY_RATES.get(state_code)
    if not state_data:
        state_data = INDIA_ELECTRICITY_RATES.get("IN", {})

    tariff_data = state_data.get(consumer_type, {})
    slabs = tariff_data.get("slabs", [])

    if not slabs:
        return tariff_data.get("effective_avg_rate", 5.50)

    # Find the slab that contains the given consumption level
    for slab in slabs:
        slab_min = slab["min"]
        slab_max = slab.get("max")
        rate = slab["rate"]

        if slab_max is None or monthly_consumption_kwh <= slab_max:
            return rate

    # If consumption exceeds all slabs, return the last slab rate
    return slabs[-1]["rate"]


def _resolve_electricity_rate(state_code: Optional[str]) -> float:
    """Return effective electricity rate in ₹/kWh for the given Indian state code.

    Uses the marginal rate for a typical 250 units/month household,
    since solar offsets units at the highest tariff slab.
    """
    code = state_code or "IN"

    # Try marginal rate first (more accurate for solar savings)
    rate = get_marginal_rate(code, monthly_consumption_kwh=250)
    return rate


def _resolve_install_cost(state_code: Optional[str]) -> float:
    """Return install cost in ₹/watt for the given Indian state code."""
    if state_code and state_code in INDIA_INSTALL_COSTS:
        return INDIA_INSTALL_COSTS[state_code]
    return INDIA_INSTALL_COSTS["IN"]  # national average


def _resolve_maintenance_profile(state_code: Optional[str]) -> Dict[str, float]:
    """Return maintenance profile for the given Indian state code."""
    if state_code and state_code in INDIA_MAINTENANCE_PROFILES:
        return INDIA_MAINTENANCE_PROFILES[state_code]
    return INDIA_MAINTENANCE_PROFILES["DEFAULT"]


async def fetch_india_economic_inputs(
    latitude: float,
    longitude: float,
    state: Optional[str] = None,
) -> EconomicInputs:
    """Fetch Indian-specific economic inputs for solar financial analysis.

    All values are in INR (₹).
    """
    electricity_rate = _resolve_electricity_rate(state)
    install_cost = _resolve_install_cost(state)
    profile = _resolve_maintenance_profile(state)

    return EconomicInputs(
        electricity_rate_per_kwh=electricity_rate,
        install_cost_per_watt=install_cost,
        annual_maintenance_rate=profile["maintenance_rate"],
        dust_cleanings_per_year=int(profile["cleanings"]),
        dust_cleaning_cost_per_kw=profile["cleaning_cost_per_kw"],
        currency="INR",
        country="IN",
    )
