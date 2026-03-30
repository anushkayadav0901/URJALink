import pytest

from business_logic import financial_analysis, roof_analysis, solar_calculations, solar_data
from models.economics import EconomicInputs


def _basic_roof(orientation: str = "south") -> dict:
    usable = 880.0
    return {
        "roof_segments": [
            {
                "segment_id": 1,
                "panel_capacity": 50,
                "orientation_cardinal": orientation,
                "orientation_degrees": 180,
                "tilt_degrees": 25,
            }
        ],
        "usable_area_sqft": usable,
    }


@pytest.mark.asyncio
async def test_nasa_cache_prevents_duplicate_fetches(monkeypatch):
    """get_nasa_data_cached should reuse cached payload for rounded lat/lng."""
    solar_data._NASA_CACHE.clear()
    calls = {"count": 0}
    
    async def fake_fetch(lat: float, lng: float) -> dict:
        calls["count"] += 1
        return {
            "properties": {
                "parameter": {
                    "ALLSKY_SFC_SW_DWN": {
                        "ANN": 5.0,
                        "JUN": 6.0,
                        "JUL": 6.0,
                        "AUG": 6.0,
                        "DEC": 4.0,
                        "JAN": 4.0,
                        "FEB": 4.0,
                    }
                }
            }
        }
    
    monkeypatch.setattr(solar_data, "get_nasa_solar_data", fake_fetch)
    
    first = await solar_data.get_nasa_data_cached(12.34567, -98.76543)
    second = await solar_data.get_nasa_data_cached(12.34561, -98.76549)
    
    assert first == second
    assert calls["count"] == 1


def test_solar_potential_accounts_for_soiling():
    """Trees nearby should reduce annual production via the dust factor."""
    solar_input = {"peak_sun_hours_daily": 5.5}
    roof = _basic_roof()
    clean_obstacles = {"chimneys": 0, "skylights": 0, "trees_nearby": False, "hvac_units": 0}
    dusty_obstacles = {"chimneys": 0, "skylights": 0, "trees_nearby": True, "hvac_units": 0}
    
    clean = solar_calculations.calculate_solar_potential(roof, solar_input, clean_obstacles)
    dusty = solar_calculations.calculate_solar_potential(roof, solar_input, dusty_obstacles)
    
    assert dusty["annual_generation_kwh"] < clean["annual_generation_kwh"]
    assert dusty["equivalent_trees_planted"] < clean["equivalent_trees_planted"]


def test_solar_score_penalizes_orientation():
    """Non-south orientations should score lower with identical inputs."""
    solar_input = {"peak_sun_hours_daily": 5.5}
    obstacles = {"chimneys": 0, "skylights": 0, "trees_nearby": False, "hvac_units": 0}
    
    south = _basic_roof(orientation="south")
    west = _basic_roof(orientation="west")
    
    potential_south = solar_calculations.calculate_solar_potential(south, solar_input, obstacles)
    potential_west = solar_calculations.calculate_solar_potential(west, solar_input, obstacles)
    
    score_south = solar_calculations.calculate_solar_score(south, solar_input, potential_south, obstacles)
    score_west = solar_calculations.calculate_solar_score(west, solar_input, potential_west, obstacles)
    
    assert score_west < score_south


def test_financials_expose_dust_costs():
    """Dust mitigation OpEx should match provider inputs."""
    inputs = EconomicInputs(
        electricity_rate_usd_per_kwh=0.22,
        install_cost_per_watt=3.1,
        annual_maintenance_rate=0.012,
        dust_cleanings_per_year=3,
        dust_cleaning_cost_per_kw=14.0,
    )
    result = financial_analysis.calculate_enhanced_financials(
        system_size_kw=8.0,
        annual_generation_kwh=15000,
        economic_inputs=inputs,
    )
    
    expected_dust = 8.0 * inputs.dust_cleaning_cost_per_kw * inputs.dust_cleanings_per_year
    assert result["dust_mitigation_cost_annual"] == pytest.approx(expected_dust)
    assert result["total_dust_mitigation_costs_25_years"] == pytest.approx(expected_dust * 25)
    assert result["total_operational_costs_25_years"] == (
        result["total_maintenance_costs_25_years"] + result["total_dust_mitigation_costs_25_years"]
    )
