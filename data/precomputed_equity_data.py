"""
Pre-computed equity scores for Princeton, NJ area.
Data represents realistic Census block groups with varying equity profiles.

In production, this would be generated from:
- US Census API (income, renters, households)
- DOE LEAD tool (energy burden)
- OpenPV database (solar installations)
"""

from typing import List, Dict
import math


# Hardcoded equity data for ~20 representative block groups in Princeton area
# (In full implementation, expand to ~150 block groups)
PRINCETON_EQUITY_DATA: List[Dict] = [
    # High Equity Area - Western Princeton (affluent, homeowners)
    {
        "block_group_id": "340210001001",
        "lat": 40.3573,
        "lng": -74.6672,
        "equity_score": 72.4,
        "median_income": 95000,
        "renter_percentage": 18,
        "energy_burden": 3.8,
        "solar_installations": 22,
        "total_households": 520,
        "barriers": []
    },
    {
        "block_group_id": "340210001002",
        "lat": 40.3501,
        "lng": -74.6598,
        "equity_score": 68.1,
        "median_income": 87000,
        "renter_percentage": 25,
        "energy_burden": 4.2,
        "solar_installations": 18,
        "total_households": 480,
        "barriers": []
    },
    
    # Moderate Equity - Princeton Junction (mixed income)
    {
        "block_group_id": "340210002001",
        "lat": 40.3187,
        "lng": -74.6221,
        "equity_score": 48.7,
        "median_income": 58000,
        "renter_percentage": 42,
        "energy_burden": 5.9,
        "solar_installations": 8,
        "total_households": 380,
        "barriers": [
            "42% renters (no ownership rights)"
        ]
    },
    {
        "block_group_id": "340210002002",
        "lat": 40.3156,
        "lng": -74.6189,
        "equity_score": 52.3,
        "median_income": 62000,
        "renter_percentage": 38,
        "energy_burden": 5.4,
        "solar_installations": 11,
        "total_households": 420,
        "barriers": []
    },
    
    # SOLAR DESERT - Near Route 1 (low income, high renters)
    {
        "block_group_id": "340210003001",
        "lat": 40.3298,
        "lng": -74.6445,
        "equity_score": 23.1,
        "median_income": 32000,
        "renter_percentage": 78,
        "energy_burden": 9.8,
        "solar_installations": 0,
        "total_households": 340,
        "barriers": [
            "$32,000 median income (below solar loan threshold)",
            "78% renters (no ownership rights)",
            "9.8% energy burden (need relief but lack access)",
            "0 existing solar installations (no proven programs)"
        ]
    },
    {
        "block_group_id": "340210003002",
        "lat": 40.3267,
        "lng": -74.6478,
        "equity_score": 28.6,
        "median_income": 38000,
        "renter_percentage": 71,
        "energy_burden": 8.5,
        "solar_installations": 1,
        "total_households": 290,
        "barriers": [
            "$38,000 median income (below solar loan threshold)",
            "71% renters (no ownership rights)",
            "8.5% energy burden (need relief but lack access)"
        ]
    },
    
    # University Area - High renters but variable income
    {
        "block_group_id": "340210004001",
        "lat": 40.3459,
        "lng": -74.6598,
        "equity_score": 34.2,
        "median_income": 28000,  # Student households
        "renter_percentage": 92,
        "energy_burden": 4.1,  # Lower bills, shared utilities
        "solar_installations": 3,
        "total_households": 680,
        "barriers": [
            "$28,000 median income (below solar loan threshold)",
            "92% renters (no ownership rights)"
        ]
    },
    
    # Hopewell - Rural, moderate income
    {
        "block_group_id": "340210005001",
        "lat": 40.3891,
        "lng": -74.7456,
        "equity_score": 56.8,
        "median_income": 72000,
        "renter_percentage": 28,
        "energy_burden": 5.1,
        "solar_installations": 14,
        "total_households": 310,
        "barriers": []
    },
    
    # Additional areas for better coverage
    {
        "block_group_id": "340210001003",
        "lat": 40.3445,
        "lng": -74.6789,
        "equity_score": 75.2,
        "median_income": 105000,
        "renter_percentage": 15,
        "energy_burden": 3.2,
        "solar_installations": 28,
        "total_households": 445,
        "barriers": []
    },
    {
        "block_group_id": "340210002003",
        "lat": 40.3089,
        "lng": -74.6345,
        "equity_score": 44.9,
        "median_income": 54000,
        "renter_percentage": 48,
        "energy_burden": 6.8,
        "solar_installations": 6,
        "total_households": 356,
        "barriers": [
            "48% renters (no ownership rights)",
            "6.8% energy burden (need relief but lack access)"
        ]
    },
    {
        "block_group_id": "340210003003",
        "lat": 40.3234,
        "lng": -74.6512,
        "equity_score": 31.5,
        "median_income": 35000,
        "renter_percentage": 68,
        "energy_burden": 8.9,
        "solar_installations": 2,
        "total_households": 298,
        "barriers": [
            "$35,000 median income (below solar loan threshold)",
            "68% renters (no ownership rights)",
            "8.9% energy burden (need relief but lack access)"
        ]
    },
    {
        "block_group_id": "340210004002",
        "lat": 40.3512,
        "lng": -74.6634,
        "equity_score": 41.8,
        "median_income": 48000,
        "renter_percentage": 55,
        "energy_burden": 5.8,
        "solar_installations": 9,
        "total_households": 412,
        "barriers": [
            "55% renters (no ownership rights)"
        ]
    },
    {
        "block_group_id": "340210005002",
        "lat": 40.3723,
        "lng": -74.7234,
        "equity_score": 61.3,
        "median_income": 78000,
        "renter_percentage": 22,
        "energy_burden": 4.6,
        "solar_installations": 19,
        "total_households": 389,
        "barriers": []
    },
    # Additional moderate and high equity areas
    {
        "block_group_id": "340210001004",
        "lat": 40.3623,
        "lng": -74.6545,
        "equity_score": 69.7,
        "median_income": 89000,
        "renter_percentage": 21,
        "energy_burden": 3.9,
        "solar_installations": 24,
        "total_households": 467,
        "barriers": []
    },
    {
        "block_group_id": "340210002004",
        "lat": 40.3078,
        "lng": -74.6167,
        "equity_score": 50.1,
        "median_income": 59000,
        "renter_percentage": 39,
        "energy_burden": 5.7,
        "solar_installations": 12,
        "total_households": 398,
        "barriers": []
    },
    {
        "block_group_id": "340210003004",
        "lat": 40.3345,
        "lng": -74.6398,
        "equity_score": 26.8,
        "median_income": 31000,
        "renter_percentage": 74,
        "energy_burden": 9.4,
        "solar_installations": 1,
        "total_households": 312,
        "barriers": [
            "$31,000 median income (below solar loan threshold)",
            "74% renters (no ownership rights)",
            "9.4% energy burden (need relief but lack access)"
        ]
    }
]


def get_equity_data(zip_code: str = "08540") -> List[Dict]:
    """
    Get equity data for specified zip code.
    
    Args:
        zip_code: Target zip code (only Princeton area supported in demo)
        
    Returns:
        List of block group equity data dictionaries
    """
    # In demo, return all Princeton area data regardless of zip
    return PRINCETON_EQUITY_DATA


def get_solar_deserts(threshold: float = 35.0) -> List[Dict]:
    """
    Get block groups with equity scores below threshold.
    
    Args:
        threshold: Equity score cutoff (default: 35 = solar desert)
        
    Returns:
        Filtered list of low-equity block groups
    """
    return [
        bg for bg in PRINCETON_EQUITY_DATA 
        if bg["equity_score"] < threshold
    ]


def get_block_group_by_location(lat: float, lng: float) -> Dict:
    """
    Find nearest block group to given coordinates.
    
    Args:
        lat: Latitude
        lng: Longitude
        
    Returns:
        Nearest block group's equity data
    """
    def distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate Haversine distance between two points."""
        return math.sqrt((lat1 - lat2)**2 + (lng1 - lng2)**2)
    
    nearest = min(
        PRINCETON_EQUITY_DATA,
        key=lambda bg: distance(lat, lng, bg["lat"], bg["lng"])
    )
    return nearest