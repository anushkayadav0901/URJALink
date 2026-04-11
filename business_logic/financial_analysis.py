"""
Enhanced financial calculations for solar installations.

This module now requires API-backed economic inputs so that all
location-specific pricing, maintenance, and dust-mitigation costs
come from an external provider rather than hard-coded constants.

Supports multiple countries:
- US: Federal ITC (30%), EIA electricity rates, USD
- India: MNRE CFA subsidy (40%/20%), CERC tariffs, INR
"""

from typing import Dict

from core.constants import (
    ELECTRICITY_INFLATION_RATE,
    FEDERAL_ITC_RATE,
    PANEL_DEGRADATION_RATE,
    INDIA_CFA_RATE_FIRST_3KW,
    INDIA_CFA_RATE_3_TO_10KW,
    INDIA_ELECTRICITY_INFLATION_RATE,
)
from core.numeric import quantize
from models.economics import EconomicInputs


def _calculate_india_cfa_subsidy(system_size_kw: float, system_cost_gross: float) -> float:
    """Calculate MNRE Central Financial Assistance subsidy for Indian rooftop solar.

    Current MNRE rates (PM Surya Ghar):
    - 40% subsidy on first 3 kW
    - 20% subsidy on capacity between 3-10 kW
    - No subsidy above 10 kW
    """
    cost_per_kw = system_cost_gross / system_size_kw if system_size_kw > 0 else 0

    if system_size_kw <= 3:
        return system_cost_gross * INDIA_CFA_RATE_FIRST_3KW
    elif system_size_kw <= 10:
        subsidy_first_3 = 3 * cost_per_kw * INDIA_CFA_RATE_FIRST_3KW
        subsidy_rest = (system_size_kw - 3) * cost_per_kw * INDIA_CFA_RATE_3_TO_10KW
        return subsidy_first_3 + subsidy_rest
    else:
        # Above 10 kW: subsidy only on first 10 kW
        subsidy_first_3 = 3 * cost_per_kw * INDIA_CFA_RATE_FIRST_3KW
        subsidy_3_to_10 = 7 * cost_per_kw * INDIA_CFA_RATE_3_TO_10KW
        return subsidy_first_3 + subsidy_3_to_10


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
        economic_inputs: Provider-derived rates/costs (USD or INR)
        include_federal_itc: Include 30% federal ITC (US only)

    Returns:
        Dictionary with detailed financial analysis
    """
    country = economic_inputs.country
    currency = economic_inputs.currency
    is_india = country == "IN"

    electricity_rate = economic_inputs.electricity_rate_per_kwh
    cost_per_watt = economic_inputs.install_cost_per_watt

    system_cost_gross = system_size_kw * 1000 * cost_per_watt

    # Calculate subsidy/incentive based on country
    if is_india:
        subsidy_amount = _calculate_india_cfa_subsidy(system_size_kw, system_cost_gross)
        subsidy_label = "mnre_cfa"
    else:
        subsidy_amount = (
            system_cost_gross * FEDERAL_ITC_RATE if include_federal_itc else 0
        )
        subsidy_label = "federal_itc"

    system_cost_net = system_cost_gross - subsidy_amount

    panel_degradation_rate = PANEL_DEGRADATION_RATE
    electricity_inflation_rate = (
        INDIA_ELECTRICITY_INFLATION_RATE if is_india else ELECTRICITY_INFLATION_RATE
    )
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
        "subsidy_amount": round(subsidy_amount),
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
        "currency": currency,
        "incentives": {
            subsidy_label: {
                "enabled": subsidy_amount > 0,
                "rate": (
                    FEDERAL_ITC_RATE
                    if not is_india
                    else f"{INDIA_CFA_RATE_FIRST_3KW*100:.0f}%/{INDIA_CFA_RATE_3_TO_10KW*100:.0f}%"
                ),
                "amount": round(subsidy_amount),
            }
        },
        "yearly_breakdown": yearly_breakdown[:5],
    }
