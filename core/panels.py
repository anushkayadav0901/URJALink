"""Helpers for converting roof area into panel counts."""

from __future__ import annotations

from math import exp

from core.constants import (
    MAX_PANEL_COVERAGE_RATIO,
    PANEL_COVERAGE_AREA_SCALE_SQFT,
    PANEL_SURFACE_AREA_SQFT,
)


def _coverage_ratio(usable_area_sqft: float) -> float:
    """
    Estimate what share of the roof can host panels.

    Fire-code walkways, ridge setbacks, and row spacing mean small roofs have
    disproportionately large unusable margins. A saturating exponential lets the
    coverage fraction grow with area while capping at a realistic maximum for
    warehouse-scale roofs.
    """
    if usable_area_sqft <= 0:
        return 0.0
    growth = 1 - exp(-usable_area_sqft / PANEL_COVERAGE_AREA_SCALE_SQFT)
    return MAX_PANEL_COVERAGE_RATIO * growth


def calculate_panel_capacity(usable_area_sqft: float) -> int:
    """Return max panels that realistically fit on the usable roof area."""
    if usable_area_sqft <= 0:
        return 0
    coverage_ratio = _coverage_ratio(usable_area_sqft)
    if coverage_ratio <= 0:
        return 0
    effective_area = usable_area_sqft * coverage_ratio
    return int(effective_area / PANEL_SURFACE_AREA_SQFT)
