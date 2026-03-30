import importlib.util
import json
from typing import Callable

import httpx
import pytest

if importlib.util.find_spec("pydantic_settings") is None:
    pytest.skip(
        "pydantic_settings is required for summary agent tests.",
        allow_module_level=True,
    )

from business_logic.summary_agent import generate_metrics_summary
from core.config import settings
from models.financial import FinancialOutlook
from models.requests import SummaryRequest
from models.responses import Location, SolarPotential


@pytest.fixture
def sample_summary_request() -> SummaryRequest:
    """Provide a reusable summary request payload for tests."""
    return SummaryRequest(
        analysis_id="analysis-123",
        location=Location(
            latitude=37.7749, longitude=-122.4194, address="San Francisco, CA"
        ),
        solar_potential=SolarPotential(
            system_size_kw=7.5,
            annual_generation_kwh=11000,
            daily_generation_kwh=30.1,
            capacity_factor=0.18,
            energy_offset_percent=95,
            co2_offset_tons_yearly=7.2,
            co2_offset_tons_25year=180,
            equivalent_trees_planted=8,
        ),
        financial_outlook=FinancialOutlook(
            system_cost_net=18500,
            total_net_savings_25_years=42000,
            net_profit_25_years=23500,
            payback_period_years=7.5,
            roi_25_years=127.5,
            first_year_savings_gross=2650,
            first_year_savings_net=2450,
        ),
    )


def _mock_transport(
    handler: Callable[[httpx.Request], httpx.Response],
) -> httpx.MockTransport:
    """Create a reusable MockTransport factory."""
    return httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_generate_metrics_summary_success(monkeypatch, sample_summary_request):
    """Gemini summary generation returns Markdown when API responds with text."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "unit-test-key")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["key"] == "unit-test-key"
        body = json.loads(request.content.decode())
        assert "contents" in body
        return httpx.Response(
            status_code=200,
            json={
                "candidates": [
                    {
                        "model": "gemini-test-model",
                        "content": {
                            "parts": [{"text": "## Overview\nSolar looks great here."}]
                        },
                    }
                ]
            },
        )

    transport = _mock_transport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        result = await generate_metrics_summary(
            sample_summary_request, http_client=client
        )

    assert result["summary_markdown"].startswith("## Overview")
    assert result["model_name"] == "gemini-test-model"


@pytest.mark.asyncio
async def test_generate_metrics_summary_missing_key(
    monkeypatch, sample_summary_request
):
    """Missing API key should yield a validation error before calling Gemini."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    with pytest.raises(ValueError):
        await generate_metrics_summary(sample_summary_request)


@pytest.mark.asyncio
async def test_generate_metrics_summary_handles_empty_response(
    monkeypatch, sample_summary_request
):
    """Empty candidates should raise a runtime error."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "unit-test-key")

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=200, json={"candidates": []})

    transport = _mock_transport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        with pytest.raises(RuntimeError):
            await generate_metrics_summary(sample_summary_request, http_client=client)
