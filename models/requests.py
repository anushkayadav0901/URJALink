from pydantic import BaseModel, Field
from typing import Optional, List

from models.responses import Location, SolarPotential
from models.financial import FinancialOutlook


class AnalyzeRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str = ""
    state: str = Field(..., min_length=2, max_length=2, description="US state/territory code (e.g., CA)")
    zip_code: Optional[str] = None
    user_polygon: Optional[List[List[float]]] = Field(
        None,
        description="User-drawn polygon coordinates as [[lat, lng], [lat, lng], ...], minimum 3 points"
    )


class AgentsRequest(BaseModel):
    """Request for agent analysis after solar analysis"""
    analysis_id: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str
    system_size_kw: float
    annual_generation_kwh: int
    state: Optional[str] = None
    zip_code: Optional[str] = None
    user_polygon: Optional[List[List[float]]] = Field(
        None,
        description="User-drawn polygon coordinates as [[lat, lng], [lat, lng], ...]"
    )


class SummaryRequest(BaseModel):
    """Payload for requesting a Gemini-generated narrative summary."""
    analysis_id: str
    location: Location
    solar_potential: SolarPotential
    financial_outlook: FinancialOutlook
    additional_context: Optional[str] = Field(
        default=None,
        description="Optional free-form notes to steer the narrative tone."
    )


class BillComparisonRequest(BaseModel):
    """Request for bill comparison analysis."""
    first_year_savings_net: float = Field(..., gt=0, description="First year net savings in USD")
    payback_period_years: float = Field(..., gt=0, description="Payback period in years")
    monthly_savings: float = Field(..., gt=0, description="Monthly savings in USD")
