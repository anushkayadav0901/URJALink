from typing import Dict

from core.constants import (
    BASE_SHADING_PERCENT,
    CHIMNEY_SHADING_PERCENT,
    CO2_PER_KWH_METRIC_TONS,
    DAYS_PER_YEAR,
    HVAC_SHADING_PERCENT,
    IDEAL_USABLE_AREA_SQFT,
    MAX_SHADING_PERCENT,
    ORIENTATION_FACTORS,
    PANEL_WATTAGE_KW,
    SCORE_REFERENCE_CAPACITY_FACTOR,
    SCORE_REFERENCE_PEAK_SUN_HOURS,
    SCORE_REFERENCE_SYSTEM_SIZE_KW,
    SKYLIGHT_SHADING_PERCENT,
    SOILING_LOSS_FRACTION,
    SOILING_MAX_LOSS,
    SOILING_TREE_ADDER,
    SYSTEM_EFFICIENCY_BASE,
    TREE_SHADING_PERCENT,
    TREES_PER_METRIC_TON,
    TYPICAL_HOME_CONSUMPTION_KWH,
)
from core.numeric import quantize


def _orientation_factor(roof_data: Dict) -> float:
    """Return orientation factor for the primary roof segment."""
    orientation = roof_data['roof_segments'][0]['orientation_cardinal']
    return ORIENTATION_FACTORS.get(orientation, ORIENTATION_FACTORS['default'])


def _shading_factor(obstacles: Dict) -> float:
    """Deterministically derive a shading multiplier from obstacle counts."""
    shading_penalty = BASE_SHADING_PERCENT
    shading_penalty += obstacles.get('chimneys', 0) * CHIMNEY_SHADING_PERCENT
    shading_penalty += obstacles.get('skylights', 0) * SKYLIGHT_SHADING_PERCENT
    shading_penalty += obstacles.get('hvac_units', 0) * HVAC_SHADING_PERCENT
    if obstacles.get('trees_nearby', False):
        shading_penalty += TREE_SHADING_PERCENT
    capped_penalty = min(shading_penalty, MAX_SHADING_PERCENT)
    return 1 - (capped_penalty / 100)


def _soiling_factor(obstacles: Dict) -> float:
    """Account for dust accumulation with optional penalty for nearby trees."""
    loss = SOILING_LOSS_FRACTION
    if obstacles.get('trees_nearby', False):
        loss += SOILING_TREE_ADDER
    return 1 - min(loss, SOILING_MAX_LOSS)


def calculate_solar_potential(
    roof_data: dict,
    solar_data: dict,
    obstacles: dict
) -> dict:
    """Calculate complete solar potential with deterministic modifiers."""
    total_panels = sum(
        segment['panel_capacity']
        for segment in roof_data['roof_segments']
    )
    system_size_kw = total_panels * PANEL_WATTAGE_KW
    
    if system_size_kw == 0:
        return {
            "system_size_kw": 0.0,
            "annual_generation_kwh": 0,
            "daily_generation_kwh": 0.0,
            "capacity_factor": 0.0,
            "energy_offset_percent": 0,
            "co2_offset_tons_yearly": 0.0,
            "co2_offset_tons_25year": 0,
            "equivalent_trees_planted": 0
        }
    
    peak_sun_hours = solar_data['peak_sun_hours_daily']
    orientation_factor = _orientation_factor(roof_data)
    shading_factor = _shading_factor(obstacles)
    soiling_factor = _soiling_factor(obstacles)
    
    annual_kwh = (
        system_size_kw * 1000 *
        peak_sun_hours *
        DAYS_PER_YEAR *
        SYSTEM_EFFICIENCY_BASE *
        orientation_factor *
        shading_factor *
        soiling_factor
    ) / 1000
    
    daily_kwh = annual_kwh / DAYS_PER_YEAR
    capacity_factor = annual_kwh / (system_size_kw * 8760)
    energy_offset_percent = min(
        (annual_kwh / TYPICAL_HOME_CONSUMPTION_KWH) * 100,
        100
    )
    co2_yearly = annual_kwh * CO2_PER_KWH_METRIC_TONS
    co2_25year = co2_yearly * 25
    equivalent_trees = int(round(co2_yearly * TREES_PER_METRIC_TON))
    
    return {
        "system_size_kw": quantize(system_size_kw, 1),
        "annual_generation_kwh": int(round(annual_kwh)),
        "daily_generation_kwh": quantize(daily_kwh, 1),
        "capacity_factor": quantize(capacity_factor, 3),
        "energy_offset_percent": int(round(energy_offset_percent)),
        "co2_offset_tons_yearly": quantize(co2_yearly, 1),
        "co2_offset_tons_25year": int(round(co2_25year)),
        "equivalent_trees_planted": equivalent_trees
    }


def calculate_solar_score(
    roof_data: dict,
    solar_data: dict,
    solar_potential: dict,
    obstacles: dict
) -> int:
    """Calculate overall solar score 0-100"""
    
    usable_area = roof_data['usable_area_sqft']
    orientation_factor = _orientation_factor(roof_data)
    roof_score = min(
        (usable_area / IDEAL_USABLE_AREA_SQFT) * orientation_factor * 100,
        100
    )
    
    peak_sun_hours = solar_data['peak_sun_hours_daily']
    irradiance_score = min(
        (peak_sun_hours / SCORE_REFERENCE_PEAK_SUN_HOURS) * 100,
        100
    )
    
    system_size_kw = solar_potential['system_size_kw']
    size_score = min(
        (system_size_kw / SCORE_REFERENCE_SYSTEM_SIZE_KW) * 100,
        100
    )
    
    capacity_factor = solar_potential['capacity_factor']
    cf_score = min(
        (capacity_factor / SCORE_REFERENCE_CAPACITY_FACTOR) * 100,
        100
    )
    
    # Obstacle score (0-100)
    obstacle_penalty = (
        obstacles.get('chimneys', 0) +
        obstacles.get('skylights', 0) +
        obstacles.get('hvac_units', 0) +
        (10 if obstacles.get('trees_nearby', False) else 0)
    )
    obstacle_score = max(100 - obstacle_penalty * 5, 0)
    
    # Weighted average
    total_score = (
        0.30 * roof_score +
        0.25 * irradiance_score +
        0.20 * size_score +
        0.15 * cf_score +
        0.10 * obstacle_score
    )
    
    return int(total_score)


def get_solar_score_breakdown(
    roof_data: dict,
    solar_data: dict,
    solar_potential: dict,
    obstacles: dict
) -> dict:
    """Get detailed breakdown of solar score components for transparency"""
    
    # Roof suitability
    usable_area = roof_data['usable_area_sqft']
    orientation_factor = _orientation_factor(roof_data)
    roof_score = min(
        (usable_area / IDEAL_USABLE_AREA_SQFT) * orientation_factor * 100,
        100
    )
    
    peak_sun_hours = solar_data['peak_sun_hours_daily']
    irradiance_score = min(
        (peak_sun_hours / SCORE_REFERENCE_PEAK_SUN_HOURS) * 100,
        100
    )
    
    system_size_kw = solar_potential['system_size_kw']
    size_score = min(
        (system_size_kw / SCORE_REFERENCE_SYSTEM_SIZE_KW) * 100,
        100
    )
    
    capacity_factor = solar_potential['capacity_factor']
    cf_score = min(
        (capacity_factor / SCORE_REFERENCE_CAPACITY_FACTOR) * 100,
        100
    )
    
    # Obstacle score
    obstacle_penalty = (
        obstacles.get('chimneys', 0) +
        obstacles.get('skylights', 0) +
        obstacles.get('hvac_units', 0) +
        (10 if obstacles.get('trees_nearby', False) else 0)
    )
    obstacle_score = max(100 - obstacle_penalty * 5, 0)
    
    return {
        "components": {
            "roof_suitability": {
                "score": round(roof_score, 1),
                "weight": 0.30,
                "weighted_score": round(0.30 * roof_score, 1),
                "details": f"{usable_area:.0f} sqft, {roof_data['roof_segments'][0]['orientation_cardinal']} facing (×{orientation_factor})"
            },
            "solar_irradiance": {
                "score": round(irradiance_score, 1),
                "weight": 0.25,
                "weighted_score": round(0.25 * irradiance_score, 1),
                "details": f"{peak_sun_hours} peak sun hours/day"
            },
            "system_size": {
                "score": round(size_score, 1),
                "weight": 0.20,
                "weighted_score": round(0.20 * size_score, 1),
                "details": f"{system_size_kw} kW system"
            },
            "capacity_factor": {
                "score": round(cf_score, 1),
                "weight": 0.15,
                "weighted_score": round(0.15 * cf_score, 1),
                "details": f"{capacity_factor:.1%} efficiency"
            },
            "obstacles": {
                "score": round(obstacle_score, 1),
                "weight": 0.10,
                "weighted_score": round(0.10 * obstacle_score, 1),
                "details": f"{obstacle_penalty} penalty points"
            }
        },
        "formula": "30% × Roof + 25% × Irradiance + 20% × Size + 15% × Efficiency + 10% × Clear Space"
    }
