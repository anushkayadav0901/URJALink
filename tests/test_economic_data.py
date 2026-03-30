import importlib.util
from unittest.mock import AsyncMock

import pytest

if importlib.util.find_spec("pydantic_settings") is None:
    pytest.skip(
        "pydantic_settings is required for economic data tests.",
        allow_module_level=True,
    )

from core.config import settings
from data_access import economic_data
from data_access.economic_data import EconomicDataError


@pytest.mark.asyncio
async def test_fetch_economic_inputs_parses_payload(monkeypatch):
    settings.EIA_API_KEY = "test-key"
    mock_rate = AsyncMock(return_value=0.23)
    monkeypatch.setattr(
        economic_data,
        "_fetch_electricity_rate_usd_per_kwh",
        mock_rate,
    )

    result = await economic_data.fetch_economic_inputs(
        latitude=37.77,
        longitude=-122.41,
        state="CA",
    )

    assert result.electricity_rate_usd_per_kwh == 0.23
    assert result.install_cost_per_watt == economic_data.INSTALL_COST_TABLE["CA"]
    assert (
        result.dust_cleanings_per_year
        == economic_data.STATE_MAINTENANCE_PROFILE["CA"]["cleanings"]
    )


@pytest.mark.asyncio
async def test_fetch_economic_inputs_requires_state(monkeypatch):
    with pytest.raises(EconomicDataError):
        await economic_data.fetch_economic_inputs(latitude=0.0, longitude=0.0)
