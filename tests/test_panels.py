from core.panels import calculate_panel_capacity


def test_panel_capacity_zero_area() -> None:
    assert calculate_panel_capacity(0) == 0
    assert calculate_panel_capacity(-50) == 0


def test_small_roof_only_fits_few_panels() -> None:
    assert calculate_panel_capacity(1200) == 5


def test_large_roof_still_capped_by_coverage_ratio() -> None:
    assert calculate_panel_capacity(10_000) == 112


def test_monotonic_growth() -> None:
    assert calculate_panel_capacity(5000) <= calculate_panel_capacity(6000)
