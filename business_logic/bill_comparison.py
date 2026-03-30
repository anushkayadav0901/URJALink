"""Bill comparison calculator for before/after solar analysis."""
from __future__ import annotations

from typing import Dict


def calculate_bill_comparison(
    monthly_bill: float,
    monthly_savings: float,
    payback_period_years: float
) -> Dict[str, float]:
    """
    Calculate before/after bill comparison.
    
    Args:
        monthly_bill: Current monthly electricity bill (USD)
        monthly_savings: Monthly savings with solar (USD)
        payback_period_years: Years until system pays for itself
        
    Returns:
        Dictionary with comparison metrics
    """
    # Calculate minimum bill (utilities typically have minimum charges)
    # Minimum bill is approximately 46.8% of current bill (accounts for fixed charges)
    minimum_bill = monthly_bill * 0.468
    
    # Calculate reducible portion of the bill (amount that can be offset by solar)
    reducible_portion = monthly_bill - minimum_bill
    
    # Calculate new bill:
    # - If savings exceed reducible portion, bill equals minimum bill
    # - Otherwise, bill is reduced by savings amount, but not below minimum
    if monthly_savings >= reducible_portion:
        new_monthly_bill = minimum_bill
    else:
        new_monthly_bill = max(minimum_bill, monthly_bill - monthly_savings)
    
    # Monthly credit represents excess generation value beyond bill coverage
    # Credit only applies to savings beyond the reducible portion
    monthly_credit = max(0.0, monthly_savings - reducible_portion)
    
    return {
        "current_monthly_bill": round(monthly_bill, 2),
        "new_monthly_bill": round(new_monthly_bill, 2),
    }

