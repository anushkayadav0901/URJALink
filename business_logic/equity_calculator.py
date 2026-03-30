from typing import List
from models.equity_models import EquityMetrics, EquityScoreBreakdown


class EquityScoreCalculator:
    """
    Calculate URJALINK Equity Score (0-100) for geographic areas.

    Higher score = MORE equitable (better solar access)
    Lower score = LESS equitable (barriers to solar)
    """

    # National median thresholds
    INCOME_THRESHOLD = 65000  # US median household income
    RENTER_THRESHOLD = 35  # % renters nationally
    ENERGY_BURDEN_THRESHOLD = 6  # HUD affordability guideline
    SOLAR_ADOPTION_THRESHOLD = 0.03  # 3% of households

    # Barrier identification thresholds
    LOW_INCOME_THRESHOLD = 40000
    HIGH_RENTER_THRESHOLD = 50
    HIGH_BURDEN_THRESHOLD = 6

    @staticmethod
    def calculate_score(metrics: EquityMetrics) -> EquityScoreBreakdown:
        """
        Calculate equity score with component breakdown.

        Args:
            metrics: Raw socioeconomic and solar data

        Returns:
            Detailed score breakdown with identified barriers
        """
        # 1. Income Access (40 points)
        income_score = min(
            40.0, (metrics.median_income / EquityScoreCalculator.INCOME_THRESHOLD) * 40
        )

        # 2. Ownership Access (30 points)
        # Penalty increases with renter percentage
        renter_penalty = (metrics.renter_percentage / 100) * 30
        ownership_score = max(0.0, 30 - renter_penalty)

        # 3. Energy Burden (20 points)
        # Lower score for higher burden (counterintuitive but reflects access gap)
        burden_score = max(
            0.0,
            20
            - (metrics.energy_burden / EquityScoreCalculator.ENERGY_BURDEN_THRESHOLD)
            * 20,
        )

        # 4. Current Solar Adoption (10 points)
        adoption_rate = metrics.solar_installations / max(metrics.total_households, 1)
        adoption_score = min(
            10.0, (adoption_rate / EquityScoreCalculator.SOLAR_ADOPTION_THRESHOLD) * 10
        )

        total_score = income_score + ownership_score + burden_score + adoption_score

        # Identify specific barriers
        barriers = EquityScoreCalculator._identify_barriers(
            metrics, income_score, ownership_score, burden_score
        )

        return EquityScoreBreakdown(
            total_score=round(total_score, 1),
            income_component=round(income_score, 1),
            ownership_component=round(ownership_score, 1),
            burden_component=round(burden_score, 1),
            adoption_component=round(adoption_score, 1),
            barriers=barriers,
        )

    @staticmethod
    def _identify_barriers(
        metrics: EquityMetrics,
        income_score: float,
        ownership_score: float,
        burden_score: float,
    ) -> List[str]:
        """Identify top barriers to solar access based on component scores."""
        barriers = []

        if metrics.median_income < EquityScoreCalculator.LOW_INCOME_THRESHOLD:
            barriers.append(
                f"${metrics.median_income:,.0f} median income (below solar loan threshold)"
            )

        if metrics.renter_percentage > EquityScoreCalculator.HIGH_RENTER_THRESHOLD:
            barriers.append(
                f"{metrics.renter_percentage:.0f}% renters (no ownership rights)"
            )

        if metrics.energy_burden > EquityScoreCalculator.HIGH_BURDEN_THRESHOLD:
            barriers.append(
                f"{metrics.energy_burden:.1f}% energy burden (need relief but lack access)"
            )

        if metrics.solar_installations == 0:
            barriers.append("0 existing solar installations (no proven programs)")

        return barriers

    @staticmethod
    def categorize_score(score: float) -> str:
        """Categorize equity score into descriptive labels."""
        if score >= 65:
            return "equitable"
        elif score >= 35:
            return "moderate"
        else:
            return "solar_desert"
