from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.geometry import calculate_polygon_area_sqft


def main() -> None:
    coords = [
        [42.32560907111622, -71.10527404411067],
        [42.32553569866175, -71.10530086620082],
        [42.32550000392326, -71.10510506494273],
        [42.32557337641935, -71.10509165389766],
    ]
    area_sqft = calculate_polygon_area_sqft(coords)
    print(f"Polygon coordinates: {coords}")
    print(f"Area: {area_sqft:.2f} sq ft")


if __name__ == "__main__":
    main()
