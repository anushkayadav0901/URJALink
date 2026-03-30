"""Economic data representations shared across services."""
from pydantic import BaseModel, Field


class EconomicInputs(BaseModel):
    """External economic inputs resolved via provider APIs."""
    electricity_rate_usd_per_kwh: float = Field(..., gt=0)
    install_cost_per_watt: float = Field(..., gt=0)
    annual_maintenance_rate: float = Field(..., gt=0)
    dust_cleanings_per_year: int = Field(..., ge=0, description="How many times per year the site needs panel cleaning.")
    dust_cleaning_cost_per_kw: float = Field(..., ge=0)
