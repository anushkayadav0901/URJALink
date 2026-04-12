from pydantic import BaseModel, Field
from typing import Optional, List

from models.responses import Location, SolarPotential
from models.financial import FinancialOutlook


class AnalyzeRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str = ""
    state: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=2,
        description="State/territory code (e.g., CA for US, DL for India). Auto-detected for India.",
    )
    zip_code: Optional[str] = None
    country: Optional[str] = Field(
        default=None,
        description="ISO 3166-1 alpha-2 country code. Auto-detected from coordinates if not provided.",
    )
    user_polygon: Optional[List[List[float]]] = Field(
        None,
        description="User-drawn polygon coordinates as [[lat, lng], [lat, lng], ...], minimum 3 points",
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
        description="User-drawn polygon coordinates as [[lat, lng], [lat, lng], ...]",
    )


class SummaryRequest(BaseModel):
    """Payload for requesting a Gemini-generated narrative summary."""

    analysis_id: str
    location: Location
    solar_potential: SolarPotential
    financial_outlook: FinancialOutlook
    additional_context: Optional[str] = Field(
        default=None,
        description="Optional free-form notes to steer the narrative tone.",
    )


class BillComparisonRequest(BaseModel):
    """Request for bill comparison analysis."""

    first_year_savings_net: float = Field(
        ..., gt=0, description="First year net savings in USD"
    )
    payback_period_years: float = Field(
        ..., gt=0, description="Payback period in years"
    )
    monthly_savings: float = Field(..., gt=0, description="Monthly savings in USD")

class AreaAnalysisRequest(BaseModel):
    """Request for area-level solar sweet-spot analysis."""

    query: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Area name or address, e.g. 'Dwarka Sector 3, Delhi'",
    )
    grid_size: int = Field(
        default=4,
        ge=2,
        le=8,
        description="Grid resolution NxN for sampling points across the area",
    )
