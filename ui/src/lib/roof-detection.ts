export interface Point {
  lat: number;
  lng: number;
}

/**
 * Calculate the area of a polygon defined by lat/lng points using
 * the Shoelace formula projected onto a local Cartesian plane.
 *
 * The result is returned in **square metres**.
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  // Earth radius in metres
  const R = 6371000;

  // Convert lat/lng to local x/y (metres) relative to the centroid
  const centroid = {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  };

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const xy = points.map((p) => ({
    x: R * toRadians(p.lng - centroid.lng) * Math.cos(toRadians(centroid.lat)),
    y: R * toRadians(p.lat - centroid.lat),
  }));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    area += xy[i].x * xy[j].y;
    area -= xy[j].x * xy[i].y;
  }

  return Math.abs(area) / 2;
}
