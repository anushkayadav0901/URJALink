"""Central repository for deterministic solar modeling constants."""

from __future__ import annotations

from typing import Dict

# Coordinate + caching precision ------------------------------------------------
COORD_ROUNDING_PRECISION: int = 3
NASA_CACHE_MAX_SIZE: int = 256  # soft cap, manual eviction when exceeded

# Roof + panel geometry ---------------------------------------------------------
ESTIMATED_ROOF_TOTAL_AREA_SQFT: float = 1200.0
USABLE_AREA_RATIO: float = 0.85
PANEL_SURFACE_AREA_SQFT: float = 17.6
MAX_PANEL_COVERAGE_RATIO: float = 0.5  # Max fraction of roof that can host panels
PANEL_COVERAGE_AREA_SCALE_SQFT: float = 2300.0  # Controls how fast coverage ramps
PANEL_WATTAGE_KW: float = 0.4  # 400 W panels
DEFAULT_ROOF_CONFIDENCE: float = 0.75
USER_POLYGON_CONFIDENCE: float = 0.95

# Solar production factors ------------------------------------------------------
DAYS_PER_YEAR: int = 365
SYSTEM_EFFICIENCY_BASE: float = 0.75
SOILING_LOSS_FRACTION: float = 0.03  # 3% annual energy loss from dust
SOILING_TREE_ADDER: float = 0.01  # extra dust loss when trees are nearby
SOILING_MAX_LOSS: float = 0.08  # keep the combined loss bounded
BASE_SHADING_PERCENT: float = 5.0
MAX_SHADING_PERCENT: float = 22.0
CHIMNEY_SHADING_PERCENT: float = 2.0
SKYLIGHT_SHADING_PERCENT: float = 1.5
HVAC_SHADING_PERCENT: float = 2.0
TREE_SHADING_PERCENT: float = 5.0

ORIENTATION_FACTORS: Dict[str, float] = {
    "south": 1.00,
    "southwest": 0.95,
    "southeast": 0.95,
    "west": 0.85,
    "east": 0.85,
    "north": 0.60,
    "default": 0.85,
}

# Scoring references ------------------------------------------------------------
IDEAL_USABLE_AREA_SQFT: float = 1500.0
SCORE_REFERENCE_PEAK_SUN_HOURS: float = 7.0
SCORE_REFERENCE_SYSTEM_SIZE_KW: float = 10.0
SCORE_REFERENCE_CAPACITY_FACTOR: float = 0.20

# Environmental impact ----------------------------------------------------------
TYPICAL_HOME_CONSUMPTION_KWH: float = 10500.0
CO2_PER_KWH_METRIC_TONS: float = 0.0004  # US EPA eGRID 2022 avg (~0.88 lb CO₂ / kWh)
TREES_PER_METRIC_TON: float = (
    16.5  # EPA greenhouse-gas equivalency (tree seedlings grown 10 yrs)
)

FEDERAL_ITC_RATE: float = 0.30
PANEL_DEGRADATION_RATE: float = 0.005
ELECTRICITY_INFLATION_RATE: float = 0.025

# India-specific constants -------------------------------------------------------
# MNRE Central Financial Assistance (CFA) subsidy for residential rooftop solar
INDIA_CFA_RATE_FIRST_3KW: float = 0.40   # 40% subsidy for first 3 kW
INDIA_CFA_RATE_3_TO_10KW: float = 0.20   # 20% subsidy for 3–10 kW
INDIA_ELECTRICITY_INFLATION_RATE: float = 0.03  # ~3% annual tariff increase
INDIA_CO2_PER_KWH_METRIC_TONS: float = 0.00082  # CEA CO2 Baseline Database v19

