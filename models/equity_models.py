from pydantic import BaseModel, Field
from typing import List


class EquityMetrics(BaseModel):
    """Raw metrics used to calculate equity score."""
    median_income: float = Field(..., description="Median household income")
    renter_percentage: float = Field(..., ge=0, le=100, description="% renter-occupied")
    energy_burden: float = Field(..., description="% of income spent on energy")
    solar_installations: int = Field(..., ge=0, description="Existing solar count")
    total_households: int = Field(..., gt=0, description="Total households")


class EquityScoreBreakdown(BaseModel):
    """Detailed breakdown of equity score components."""
    total_score: float = Field(..., ge=0, le=100)
    income_component: float = Field(..., ge=0, le=40)
    ownership_component: float = Field(..., ge=0, le=30)
    burden_component: float = Field(..., ge=0, le=20)
    adoption_component: float = Field(..., ge=0, le=10)
    barriers: List[str] = Field(default_factory=list)


class BlockGroupEquityData(BaseModel):
    """Equity data for a single Census block group."""
    block_group_id: str
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    equity_score: float = Field(..., ge=0, le=100)
    median_income: float
    renter_percentage: float
    energy_burden: float
    solar_installations: int
    total_households: int
    barriers: List[str]


class EquityAnalysisResponse(BaseModel):
    """Response model for equity analysis API."""
    user_address_score: EquityScoreBreakdown
    neighborhood_data: List[BlockGroupEquityData]
    solar_deserts_count: int = Field(..., description="Count of block groups with score < 35")
    area_description: str = Field(..., description="e.g., 'Princeton, NJ area'")