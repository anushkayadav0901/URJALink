// ---------------------------------------------------------------------------
// URJALINK API – Thin adapter layer
//
// All types are sourced from the Kubb-generated OpenAPI models.
// All API calls go through Kubb-generated React Query hooks.
//
// This file keeps only:
//   1. Re-exports of Kubb types (so existing imports don't break)
//   2. Pure UI helper functions that have no Kubb equivalent
// ---------------------------------------------------------------------------

// ── Re-export Kubb-generated types under their original names ────────────────

export type { Location as URJALINKLocation } from "@/lib/api/models/Location";
export type { RoofPolygon } from "@/lib/api/models/RoofPolygon";
export type { RoofSegment } from "@/lib/api/models/RoofSegment";
export type { Obstacles } from "@/lib/api/models/Obstacles";
export type { SeasonalVariation } from "@/lib/api/models/SeasonalVariation";
export type { SolarData } from "@/lib/api/models/SolarData";
export type { SolarPotential } from "@/lib/api/models/SolarPotential";
export type { SolarScoreBreakdown } from "@/lib/api/models/SolarScoreBreakdown";
export type { FinancialOutlook } from "@/lib/api/models/FinancialOutlook";
export type { EquityScoreBreakdown } from "@/lib/api/models/EquityScoreBreakdown";
export type { BlockGroupEquityData } from "@/lib/api/models/BlockGroupEquityData";
export type { EquityAnalysisResponse } from "@/lib/api/models/EquityAnalysisResponse";
export type { AnalysisResponse as URJALINKResponse } from "@/lib/api/models/AnalysisResponse";
export type { InstallersResponse } from "@/lib/api/models/InstallersResponse";
export type { IncentivesResponse } from "@/lib/api/models/IncentivesResponse";
export type { SummaryResponse } from "@/lib/api/models/SummaryResponse";
export type { BillComparisonResponse } from "@/lib/api/models/BillComparisonResponse";

// The manual type had a `RoofAnalysis` interface — re-export from Kubb
export type { RoofAnalysis } from "@/lib/api/models/RoofAnalysis";

// ── UI Helper: Categorise Equity Score ───────────────────────────────────────

export function categorizeEquityScore(
  score: number,
): "high" | "moderate" | "solar_desert" {
  if (score >= 65) return "high";
  if (score >= 35) return "moderate";
  return "solar_desert";
}

// ── UI Helper: Convert backend polygon to Google Maps format ─────────────────

/**
 * The backend stores polygons as `[[lat, lng], …]`.
 * Google Maps expects `{ lat, lng }[]`.
 */
export function URJALINKPolygonToGoogleMaps(
  coords: number[][],
): { lat: number; lng: number }[] {
  return coords.map(([lat, lng]) => ({ lat, lng }));
}

// ── UI Helper: Format raw analysis into SolarStats ───────────────────────────

import type { SolarStats } from "@/types/solar";
import type { AnalysisResponse } from "@/lib/api/models/AnalysisResponse";

export function formatURJALINKStats(response: AnalysisResponse): SolarStats {
  const {
    roof_analysis,
    solar_potential,
    financial_outlook,
    solar_score,
    solar_score_breakdown,
  } = response;
  const segment = roof_analysis.roof_segments[0];

  return {
    analysisId: response.analysis_id,
    location: response.location,
    maxPanels: roof_analysis.roof_segments.reduce(
      (sum, s) => sum + s.panel_capacity,
      0,
    ),
    roofAreaSqft: Math.round(roof_analysis.total_area_sqft),
    usableAreaSqft: roof_analysis.usable_area_sqft,
    systemSizeKw: solar_potential.system_size_kw,
    yearlyEnergyKwh: solar_potential.annual_generation_kwh,
    dailyEnergyKwh: solar_potential.daily_generation_kwh,
    systemCost: financial_outlook.system_cost_net,
    annualSavings: financial_outlook.first_year_savings_net,
    paybackYears: Number(financial_outlook.payback_period_years.toFixed(1)),
    roi: Number(financial_outlook.roi_25_years.toFixed(1)),
    carbonOffset: Math.round(solar_potential.co2_offset_tons_yearly * 1000),
    treesEquivalent: solar_potential.equivalent_trees_planted,
    confidence: Math.round(roof_analysis.confidence_score * 100),
    analysisType: segment?.polygon ? "ai-detected" : "user-defined",
    orientation: segment?.orientation_cardinal ?? "Unknown",
    polygonPoints: segment?.polygon?.coordinates.length ?? 0,
    aiModel: "URJALINK v1",
    sunshineHours: response.solar_data.peak_sun_hours_daily,
    roofArea: roof_analysis.total_area_sqft,
    tiltAngle: segment?.tilt_degrees ?? 0,
    solarScore: solar_score,
    solarScoreBreakdown: solar_score_breakdown ?? undefined,
    fullResponse: response,
  };
}
