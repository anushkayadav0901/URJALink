"""
Tests for agent functionality
"""

import importlib.util
import os
from unittest.mock import AsyncMock, patch

import pytest

if os.getenv("RUN_AGENT_TESTS") != "1" or importlib.util.find_spec("fastapi") is None:
    pytest.skip(
        "Set RUN_AGENT_TESTS=1 and install fastapi to enable agent endpoint tests.",
        allow_module_level=True,
    )

from fastapi.testclient import TestClient
from main import app
from models.requests import AgentsRequest


client = TestClient(app)


def test_health_endpoint():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@patch("api.routes.find_solar_installers_stream")
def test_installers_endpoint_with_valid_request(mock_stream):
    """Test installers endpoint with valid request data and SSE streaming"""

    # Mock the streaming response
    async def mock_generator():
        yield "## Solar Installers Near You\n"
        yield "\n"
        yield "### 1. SunPower by Stellar Solar\n"
        yield "- Phone: (555) 123-4567\n"
        yield "- Website: https://example.com\n"

    mock_stream.return_value = mock_generator()

    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
        "state": "CA",
        "zip_code": "94102",
    }

    response = client.post("/api/v1/agents/installers", json=request_data)

    # Should return 200 with SSE streaming response
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    # Check headers
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["connection"] == "keep-alive"

    # Verify the mock was called with correct parameters
    mock_stream.assert_called_once()
    call_kwargs = mock_stream.call_args.kwargs
    assert call_kwargs["latitude"] == 37.7749
    assert call_kwargs["longitude"] == -122.4194
    assert call_kwargs["address"] == "San Francisco, CA"
    assert call_kwargs["system_size_kw"] == 10.0


@patch("api.routes.find_solar_incentives_stream")
def test_incentives_endpoint_with_valid_request(mock_stream):
    """Test incentives endpoint with valid request data and SSE streaming"""

    # Mock the streaming response
    async def mock_generator():
        yield "## Solar Incentives and Rebates\n"
        yield "\n"
        yield "### Federal Incentives\n"
        yield "**Federal Investment Tax Credit (ITC)**\n"
        yield "- Type: Federal Tax Credit\n"
        yield "- Value: 30% of total system cost\n"
        yield "- Estimated Savings: $9,000\n"

    mock_stream.return_value = mock_generator()

    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
        "state": "CA",
        "zip_code": "94102",
    }

    response = client.post("/api/v1/agents/incentives", json=request_data)

    # Should return 200 with SSE streaming response
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    # Check headers
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["connection"] == "keep-alive"

    # Verify the mock was called with correct parameters
    mock_stream.assert_called_once()
    call_kwargs = mock_stream.call_args.kwargs
    assert call_kwargs["latitude"] == 37.7749
    assert call_kwargs["longitude"] == -122.4194
    assert call_kwargs["address"] == "San Francisco, CA"
    assert call_kwargs["system_size_kw"] == 10.0
    assert call_kwargs["annual_generation_kwh"] == 14000
    assert call_kwargs["state"] == "CA"
    assert call_kwargs["zip_code"] == "94102"


def test_installers_endpoint_missing_fields():
    """Test installers endpoint with missing required fields"""
    request_data = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        # Missing required fields
    }

    response = client.post("/api/v1/agents/installers", json=request_data)
    assert response.status_code == 422  # Validation error


def test_incentives_endpoint_missing_fields():
    """Test incentives endpoint with missing required fields"""
    request_data = {
        "latitude": 37.7749,
        "longitude": -122.4194,
        # Missing required fields
    }

    response = client.post("/api/v1/agents/incentives", json=request_data)
    assert response.status_code == 422  # Validation error


def test_installers_endpoint_invalid_latitude():
    """Test installers endpoint with invalid latitude"""
    request_data = {
        "analysis_id": "test-123",
        "latitude": 100.0,  # Invalid: > 90
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
    }

    response = client.post("/api/v1/agents/installers", json=request_data)
    assert response.status_code == 422  # Validation error


def test_incentives_endpoint_invalid_longitude():
    """Test incentives endpoint with invalid longitude"""
    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -200.0,  # Invalid: < -180
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
    }

    response = client.post("/api/v1/agents/incentives", json=request_data)
    assert response.status_code == 422  # Validation error


@patch("api.routes.find_solar_installers_stream")
@patch("api.routes.find_solar_incentives_stream")
def test_both_endpoints_work_independently(
    mock_incentive_stream, mock_installer_stream
):
    """Test that both endpoints work independently with their own logic"""

    # Mock installer stream
    async def mock_installer_generator():
        yield "Installer data here"

    # Mock incentive stream
    async def mock_incentive_generator():
        yield "Incentive data here"

    mock_installer_stream.return_value = mock_installer_generator()
    mock_incentive_stream.return_value = mock_incentive_generator()

    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
        "state": "CA",
        "zip_code": "94102",
    }

    installer_response = client.post("/api/v1/agents/installers", json=request_data)
    incentive_response = client.post("/api/v1/agents/incentives", json=request_data)

    assert installer_response.status_code == 200
    assert incentive_response.status_code == 200

    # Verify both mocks were called
    mock_installer_stream.assert_called_once()
    mock_incentive_stream.assert_called_once()


def _summary_request_body():
    return {
        "analysis_id": "analysis-abc",
        "location": {
            "latitude": 37.77,
            "longitude": -122.41,
            "address": "San Francisco, CA",
        },
        "solar_potential": {
            "system_size_kw": 7.5,
            "annual_generation_kwh": 11000,
            "daily_generation_kwh": 30.1,
            "capacity_factor": 0.18,
            "energy_offset_percent": 95,
            "co2_offset_tons_yearly": 7.2,
            "co2_offset_tons_25year": 180,
            "equivalent_trees_planted": 8,
        },
        "financial_outlook": {
            "system_cost_net": 18500,
            "total_net_savings_25_years": 42000,
            "net_profit_25_years": 23500,
            "payback_period_years": 7.5,
            "roi_25_years": 127.5,
            "first_year_savings_gross": 2650,
            "first_year_savings_net": 2450,
        },
    }


@patch("api.routes.generate_metrics_summary", new_callable=AsyncMock)
def test_summary_endpoint_success(mock_summary):
    """Summary endpoint should return Gemini content."""
    mock_summary.return_value = {
        "summary_markdown": "## Overview\nContent",
        "model_name": "gemini-model",
    }

    response = client.post("/api/v1/summary", json=_summary_request_body())

    assert response.status_code == 200
    body = response.json()
    assert body["analysis_id"] == "analysis-abc"
    assert body["model_name"] == "gemini-model"
    assert "summary_markdown" in body
    mock_summary.assert_awaited_once()


@patch("api.routes.generate_metrics_summary", new_callable=AsyncMock)
def test_summary_endpoint_handles_value_error(mock_summary):
    """Summary endpoint returns 400 when business logic raises ValueError."""
    mock_summary.side_effect = ValueError("invalid metrics")

    response = client.post("/api/v1/summary", json=_summary_request_body())

    assert response.status_code == 400
    assert "invalid metrics" in response.json()["detail"]


@patch("api.routes.generate_metrics_summary", new_callable=AsyncMock)
def test_summary_endpoint_handles_runtime_error(mock_summary):
    """Summary endpoint returns 502 when Gemini call fails upstream."""
    mock_summary.side_effect = RuntimeError("gemini down")

    response = client.post("/api/v1/summary", json=_summary_request_body())

    assert response.status_code == 502
    assert "gemini down" in response.json()["detail"]


@pytest.mark.asyncio
async def test_agents_request_model():
    """Test AgentsRequest model validation"""
    # Valid request
    request = AgentsRequest(
        analysis_id="test-123",
        latitude=37.7749,
        longitude=-122.4194,
        address="San Francisco, CA",
        system_size_kw=10.0,
        annual_generation_kwh=14000,
        state="CA",
        zip_code="94102",
    )
    assert request.latitude == 37.7749
    assert request.longitude == -122.4194
    assert request.state == "CA"

    # Invalid latitude
    with pytest.raises(Exception):
        AgentsRequest(
            analysis_id="test-123",
            latitude=100.0,  # Invalid
            longitude=-122.4194,
            address="San Francisco, CA",
            system_size_kw=10.0,
            annual_generation_kwh=14000,
        )


@patch("api.routes.find_solar_installers_stream")
def test_installers_endpoint_error_handling(mock_stream):
    """Test installers endpoint error handling"""

    # Mock an error in the stream
    async def mock_error_generator():
        yield "Error: Installer finder agent failed: Connection timeout"

    mock_stream.return_value = mock_error_generator()

    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
    }

    response = client.post("/api/v1/agents/installers", json=request_data)

    # Should still return 200 with error message in stream
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]


@patch("api.routes.find_solar_incentives_stream")
def test_incentives_endpoint_error_handling(mock_stream):
    """Test incentives endpoint error handling"""

    # Mock an error in the stream
    async def mock_error_generator():
        yield "Error: Incentive agent failed: API rate limit exceeded"

    mock_stream.return_value = mock_error_generator()

    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
    }

    response = client.post("/api/v1/agents/incentives", json=request_data)

    # Should still return 200 with error message in stream
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]


def test_installers_endpoint_with_minimal_data():
    """Test installers endpoint with minimal required data (no optional fields)"""
    request_data = {
        "analysis_id": "test-123",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "address": "New York, NY",
        "system_size_kw": 5.0,
        "annual_generation_kwh": 7000,
        # No state or zip_code (optional fields)
    }

    response = client.post("/api/v1/agents/installers", json=request_data)
    assert response.status_code == 200


def test_incentives_endpoint_with_minimal_data():
    """Test incentives endpoint with minimal required data (no optional fields)"""
    request_data = {
        "analysis_id": "test-123",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "address": "New York, NY",
        "system_size_kw": 5.0,
        "annual_generation_kwh": 7000,
        # No state or zip_code (optional fields)
    }

    response = client.post("/api/v1/agents/incentives", json=request_data)
    assert response.status_code == 200


@patch("api.routes.find_solar_installers_stream")
def test_installers_with_various_locations(mock_stream):
    """Test installers endpoint with various US locations"""

    async def mock_generator():
        yield "Mock installer data"

    mock_stream.return_value = mock_generator()

    locations = [
        {"lat": 47.6062, "lng": -122.3321, "address": "Seattle, WA"},
        {"lat": 25.7617, "lng": -80.1918, "address": "Miami, FL"},
        {"lat": 41.8781, "lng": -87.6298, "address": "Chicago, IL"},
        {"lat": 33.4484, "lng": -112.0740, "address": "Phoenix, AZ"},
    ]

    for loc in locations:
        request_data = {
            "analysis_id": "test-123",
            "latitude": loc["lat"],
            "longitude": loc["lng"],
            "address": loc["address"],
            "system_size_kw": 8.0,
            "annual_generation_kwh": 11000,
        }

        response = client.post("/api/v1/agents/installers", json=request_data)
        assert response.status_code == 200, f"Failed for location: {loc['address']}"


@patch("api.routes.find_solar_incentives_stream")
def test_incentives_with_various_system_sizes(mock_stream):
    """Test incentives endpoint with various system sizes"""

    async def mock_generator():
        yield "Mock incentive data"

    mock_stream.return_value = mock_generator()

    system_sizes = [3.0, 5.0, 8.0, 10.0, 15.0, 20.0]

    for size in system_sizes:
        request_data = {
            "analysis_id": "test-123",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "address": "San Francisco, CA",
            "system_size_kw": size,
            "annual_generation_kwh": int(size * 1400),  # Approximate generation
            "state": "CA",
        }

        response = client.post("/api/v1/agents/incentives", json=request_data)
        assert response.status_code == 200, f"Failed for system size: {size} kW"


def test_installers_endpoint_empty_address():
    """Test installers endpoint with empty address string"""
    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
    }

    # Should accept empty address but still process
    response = client.post("/api/v1/agents/installers", json=request_data)
    assert response.status_code == 200


def test_incentives_endpoint_edge_coordinates():
    """Test incentives endpoint with edge case coordinates"""
    # Alaska
    request_data = {
        "analysis_id": "test-123",
        "latitude": 64.2008,
        "longitude": -149.4937,
        "address": "Fairbanks, AK",
        "system_size_kw": 5.0,
        "annual_generation_kwh": 5000,
    }

    response = client.post("/api/v1/agents/incentives", json=request_data)
    assert response.status_code == 200


def test_response_headers_correct():
    """Test that response headers are correctly set for SSE"""
    request_data = {
        "analysis_id": "test-123",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "San Francisco, CA",
        "system_size_kw": 10.0,
        "annual_generation_kwh": 14000,
    }

    response = client.post("/api/v1/agents/installers", json=request_data)

    # Check all SSE headers
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["connection"] == "keep-alive"
    assert response.headers["x-accel-buffering"] == "no"
