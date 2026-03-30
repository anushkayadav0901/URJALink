"""
Enhanced financial calculations for solar installations.

This module now requires API-backed economic inputs so that all
location-specific pricing, maintenance, and dust-mitigation costs
come from an external provider rather than hard-coded constants.
"""

from typing import Dict

from core.constants import (
    ELECTRICITY_INFLATION_RATE,
    FEDERAL_ITC_RATE,
    PANEL_DEGRADATION_RATE,
)
from core.numeric import quantize
from models.economics import EconomicInputs


def calculate_enhanced_financials(
    system_size_kw: float,
    annual_generation_kwh: int,
    economic_inputs: EconomicInputs,
    include_federal_itc: bool = True,
) -> Dict:
    """
    Calculate comprehensive financial analysis for solar installation.

    Args:
        system_size_kw: System size in kilowatts
        annual_generation_kwh: First-year annual generation in kWh
        economic_inputs: Provider-derived rates/costs
        include_federal_itc: Include 30% federal Investment Tax Credit

    Returns:
        Dictionary with detailed financial analysis
    """
    electricity_rate = economic_inputs.electricity_rate_usd_per_kwh
    cost_per_watt = economic_inputs.install_cost_per_watt

    system_cost_gross = system_size_kw * 1000 * cost_per_watt
    federal_itc_amount = (
        system_cost_gross * FEDERAL_ITC_RATE if include_federal_itc else 0
    )
    system_cost_net = system_cost_gross - federal_itc_amount

    panel_degradation_rate = PANEL_DEGRADATION_RATE
    electricity_inflation_rate = ELECTRICITY_INFLATION_RATE
    maintenance_cost_rate = economic_inputs.annual_maintenance_rate
    maintenance_cost_annual = system_cost_gross * maintenance_cost_rate
    dust_cleaning_cost_annual = (
        system_size_kw
        * economic_inputs.dust_cleaning_cost_per_kw
        * economic_inputs.dust_cleanings_per_year
    )

    total_savings = 0.0
    total_operational_costs = 0.0
    yearly_breakdown = []

    for year in range(1, 26):
        degradation_factor = (1 - panel_degradation_rate) ** (year - 1)
        year_generation = annual_generation_kwh * degradation_factor
        year_rate = electricity_rate * (1 + electricity_inflation_rate) ** (year - 1)

        year_savings = year_generation * year_rate
        year_maintenance = maintenance_cost_annual
        year_operational_cost = year_maintenance + dust_cleaning_cost_annual
        year_net_savings = year_savings - year_operational_cost

        total_savings += year_savings
        total_operational_costs += year_operational_cost

        yearly_breakdown.append(
            {
                "year": year,
                "generation_kwh": round(year_generation),
                "electricity_rate": round(year_rate, 3),
                "gross_savings": round(year_savings),
                "maintenance_cost": round(year_maintenance),
                "dust_mitigation_cost": round(dust_cleaning_cost_annual),
                "net_savings": round(year_net_savings),
            }
        )

    net_profit_25_years = total_savings - total_operational_costs - system_cost_net
    payback_year = None
    cumulative_savings = 0.0

    # Calculate payback based on gross savings (before operational costs)
    # This provides a more optimistic but still realistic payback period
    for year_data in yearly_breakdown:
        cumulative_savings += year_data["gross_savings"]
        if payback_year is None and cumulative_savings >= system_cost_net:
            payback_year = year_data["year"]

    roi_25_years = (
        (net_profit_25_years / system_cost_net) * 100 if system_cost_net > 0 else 0
    )
    first_year_savings = annual_generation_kwh * electricity_rate
    year_operational_cost = maintenance_cost_annual + dust_cleaning_cost_annual
    first_year_net = first_year_savings - year_operational_cost

    return {
        "system_cost_gross": round(system_cost_gross),
        "federal_itc_amount": round(federal_itc_amount),
        "system_cost_net": round(system_cost_net),
        "cost_per_watt": quantize(cost_per_watt, 2),
        "electricity_rate_current": round(electricity_rate, 3),
        "electricity_rate_year_25": round(
            electricity_rate * (1 + electricity_inflation_rate) ** 24, 3
        ),
        "panel_degradation_rate": panel_degradation_rate,
        "electricity_inflation_rate": electricity_inflation_rate,
        "maintenance_cost_annual": round(maintenance_cost_annual),
        "dust_mitigation_cost_annual": round(dust_cleaning_cost_annual),
        "total_energy_generated_25_years": sum(
            y["generation_kwh"] for y in yearly_breakdown
        ),
        "total_gross_savings_25_years": round(total_savings),
        "total_maintenance_costs_25_years": round(maintenance_cost_annual * 25),
        "total_dust_mitigation_costs_25_years": round(dust_cleaning_cost_annual * 25),
        "total_operational_costs_25_years": round(total_operational_costs),
        "total_net_savings_25_years": round(total_savings - total_operational_costs),
        "net_profit_25_years": round(net_profit_25_years),
        "payback_period_years": payback_year or 25,
        "roi_25_years": round(roi_25_years, 1),
        "first_year_savings_gross": round(first_year_savings),
        "first_year_savings_net": round(first_year_net),
        "incentives": {
            "federal_itc": {
                "enabled": include_federal_itc,
                "rate": FEDERAL_ITC_RATE,
                "amount": round(federal_itc_amount),
            }
        },
        "yearly_breakdown": yearly_breakdown[:5],
    }
