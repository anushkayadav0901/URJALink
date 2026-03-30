from unittest.mock import AsyncMock, patch
import importlib.util

import pytest

if importlib.util.find_spec("fastapi") is None:
    pytest.skip("fastapi is required for analyze endpoint tests.", allow_module_level=True)

from fastapi.testclient import TestClient

from data_access.economic_data import EconomicDataError
from main import app
from models.economics import EconomicInputs


client = TestClient(app)


def _sample_roof():
    return {
        "total_area_sqft": 1200.0,
        "usable_area_sqft": 960.0,
        "roof_segments": [
            {
                "segment_id": 1,
                "area_sqft": 1200.0,
                "orientation_degrees": 180,
                "orientation_cardinal": "south",
                "tilt_degrees": 25.0,
                "panel_capacity": 60,
            }
        ],
        "obstacles": {
            "chimneys": 0,
            "skylights": 0,
            "trees_nearby": False,
            "hvac_units": 0,
        },
        "confidence_score": 0.9,
    }


def _sample_nasa():
    return {
        "peak_sun_hours_daily": 5.8,
        "annual_irradiance_kwh_m2": 2100,
        "seasonal_variation": {
            "summer_sun_hours": 6.4,
            "winter_sun_hours": 4.9,
        },
    }


@patch("api.routes.analyze_roof_with_cv", new_callable=AsyncMock)
@patch("api.routes.get_nasa_data_cached", new_callable=AsyncMock)
@patch("api.routes.fetch_economic_inputs", new_callable=AsyncMock)
def test_analyze_returns_financial_outlook(mock_econ, mock_nasa, mock_roof):
    mock_roof.return_value = _sample_roof()
    mock_nasa.return_value = _sample_nasa()
    mock_econ.return_value = EconomicInputs(
        electricity_rate_usd_per_kwh=0.21,
        install_cost_per_watt=3.0,
        annual_maintenance_rate=0.012,
        dust_cleanings_per_year=2,
        dust_cleaning_cost_per_kw=15.0,
    )
    
    payload = {
        "latitude": 37.77,
        "longitude": -122.41,
        "address": "Test Address",
        "state": "CA",
        "zip_code": "94102",
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert "financial_outlook" in body
    assert body["financial_outlook"]["system_cost_net"] > 0
    assert mock_econ.await_count == 1


@patch("api.routes.analyze_roof_with_cv", new_callable=AsyncMock)
@patch("api.routes.get_nasa_data_cached", new_callable=AsyncMock)
@patch("api.routes.fetch_economic_inputs", new_callable=AsyncMock)
def test_analyze_handles_economic_data_failure(mock_econ, mock_nasa, mock_roof):
    mock_roof.return_value = _sample_roof()
    mock_nasa.return_value = _sample_nasa()
    mock_econ.side_effect = EconomicDataError("missing provider config")
    
    payload = {
        "latitude": 40.0,
        "longitude": -105.0,
        "address": "Another Address",
        "state": "CO",
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 502
    assert "Economic data unavailable" in response.json()["detail"]


def test_analyze_requires_state():
    payload = {
        "latitude": 40.0,
        "longitude": -105.0,
        "address": "Another Address",
    }
    response = client.post("/api/v1/analyze", json=payload)
    assert response.status_code == 422
