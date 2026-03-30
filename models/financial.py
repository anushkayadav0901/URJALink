"""Shared financial models."""
from pydantic import BaseModel


class FinancialOutlook(BaseModel):
    """Key financial metrics derived from the financial analysis module."""
    system_cost_net: float
    total_net_savings_25_years: float
    net_profit_25_years: float
    payback_period_years: float
    roi_25_years: float
    first_year_savings_gross: float
    first_year_savings_net: float
