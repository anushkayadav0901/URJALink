// ---------------------------------------------------------------------------
// URJALINK API Client
// Mirrors the backend Pydantic models and exposes typed fetch helpers.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ── Shared Types ──────────────────────────────────────────────────────────────

export interface URJALINKLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RoofPolygon {
  coordinates: number[][];   // [[lat, lng], …]
  area_sqft: number;
  confidence: number;
}

export interface RoofSegment {
  segment_id: number;
  area_sqft: number;
  orientation_degrees: number;
  orientation_cardinal: string;
  tilt_degrees: number;
  panel_capacity: number;
  polygon?: RoofPolygon | null;
}

export interface Obstacles {
  chimneys: number;
  skylights: number;
  trees_nearby: boolean;
  hvac_units: number;
}

export interface RoofAnalysis {
  total_area_sqft: number;
  usable_area_sqft: number;
  roof_segments: RoofSegment[];
  obstacles: Obstacles;
  confidence_score: number;
}

export interface SeasonalVariation {
  summer_sun_hours: number;
  winter_sun_hours: number;
}

export interface SolarData {
  peak_sun_hours_daily: number;
  annual_irradiance_kwh_m2: number;
  seasonal_variation: SeasonalVariation;
}

export interface SolarPotential {
  system_size_kw: number;
  annual_generation_kwh: number;
  daily_generation_kwh: number;
  capacity_factor: number;
  energy_offset_percent: number;
  co2_offset_tons_yearly: number;
  co2_offset_tons_25year: number;
  equivalent_trees_planted: number;
}

export interface ScoreComponent {
  score: number;
  weight: number;
  weighted_score: number;
  details: string;
}

export interface SolarScoreBreakdown {
  components: Record<string, ScoreComponent>;
  formula: string;
}

export interface FinancialOutlook {
  system_cost_net: number;
  total_net_savings_25_years: number;
  net_profit_25_years: number;
  payback_period_years: number;
  roi_25_years: number;
  first_year_savings_gross: number;
  first_year_savings_net: number;
}

// ── Equity Types ──────────────────────────────────────────────────────────────

export interface EquityScoreBreakdown {
  total_score: number;
  income_component: number;
  ownership_component: number;
  burden_component: number;
  adoption_component: number;
  barriers: string[];
}

export interface BlockGroupEquityData {
  block_group_id: string;
  lat: number;
  lng: number;
  equity_score: number;
  median_income: number;
  renter_percentage: number;
  energy_burden: number;
  solar_installations: number;
  total_households: number;
  barriers: string[];
}

export interface EquityAnalysisResponse {
  user_address_score: EquityScoreBreakdown;
  neighborhood_data: BlockGroupEquityData[];
  solar_deserts_count: number;
  area_description: string;
}

// ── Main Analysis Response ────────────────────────────────────────────────────

export interface URJALINKResponse {
  analysis_id: string;
  timestamp: string;
  location: URJALINKLocation;
  roof_analysis: RoofAnalysis;
  solar_data: SolarData;
  solar_potential: SolarPotential;
  solar_score: number;
  solar_score_breakdown?: SolarScoreBreakdown;
  financial_outlook: FinancialOutlook;
  equity_analysis?: EquityAnalysisResponse;
}

// ── Agent Responses ───────────────────────────────────────────────────────────

export interface InstallersResponse {
  analysis_id: string;
  generated_at: string;
  installers_markdown: string;
  model_name: string;
}

export interface IncentivesResponse {
  analysis_id: string;
  generated_at: string;
  incentives_markdown: string;
  model_name: string;
}

export interface SummaryResponse {
  analysis_id: string;
  generated_at: string;
  summary_markdown: string;
  model_name: string;
}

export interface BillComparisonResponse {
  current_monthly_bill: number;
  new_monthly_bill: number;
}

// ── Helper: Categorise Equity Score ───────────────────────────────────────────

export function categorizeEquityScore(
  score: number,
): "high" | "moderate" | "solar_desert" {
  if (score >= 65) return "high";
  if (score >= 35) return "moderate";
  return "solar_desert";
}

// ── Helper: Convert backend polygon to Google Maps format ─────────────────────

/**
 * The backend stores polygons as `[[lat, lng], …]`.
 * Google Maps expects `{ lat, lng }[]`.
 */
export function URJALINKPolygonToGoogleMaps(
  coords: number[][],
): { lat: number; lng: number }[] {
  return coords.map(([lat, lng]) => ({ lat, lng }));
}

// ── Helper: Format raw analysis into SolarStats ──────────────────────────────

import type { SolarStats } from "@/types/solar";

export function formatURJALINKStats(response: URJALINKResponse): SolarStats {
  const { roof_analysis, solar_potential, financial_outlook, solar_score, solar_score_breakdown } = response;
  const segment = roof_analysis.roof_segments[0];

  return {
    analysisId: response.analysis_id,
    location: response.location,
    maxPanels: roof_analysis.roof_segments.reduce((sum, s) => sum + s.panel_capacity, 0),
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
    solarScoreBreakdown: solar_score_breakdown,
    fullResponse: response,
  };
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Call the main `/api/v1/analyze` endpoint.
 */
export async function analyzeWithURJALINK(
  lat: number,
  lng: number,
  address: string,
  userPolygon?: { lat: number; lng: number }[],
  state?: string,
): Promise<URJALINKResponse> {
  // Convert Google Maps polygon to backend format [[lat, lng], …]
  const user_polygon = userPolygon
    ? userPolygon.map((p) => [p.lat, p.lng])
    : undefined;

  // Extract zip from address
  const zipMatch = address.match(/\b\d{5}\b/);
  const zip_code = zipMatch ? zipMatch[0] : undefined;

  const body = {
    latitude: lat,
    longitude: lng,
    address,
    state: state ?? "NJ",
    zip_code,
    user_polygon,
  };

  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Analysis failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Fetch solar installer recommendations.
 */
export async function fetchInstallers(
  analysisId: string,
  lat: number,
  lng: number,
  address: string,
  systemSizeKw: number,
  annualGenerationKwh: number,
  state: string,
  zipCode: string,
): Promise<InstallersResponse> {
  const body = {
    analysis_id: analysisId,
    latitude: lat,
    longitude: lng,
    address,
    system_size_kw: systemSizeKw,
    annual_generation_kwh: annualGenerationKwh,
    state,
    zip_code: zipCode,
  };

  const res = await fetch(`${API_BASE}/api/v1/agents/installers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Installers fetch failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Fetch solar incentives and rebates.
 */
export async function fetchIncentives(
  analysisId: string,
  lat: number,
  lng: number,
  address: string,
  systemSizeKw: number,
  annualGenerationKwh: number,
  state: string,
  zipCode: string,
): Promise<IncentivesResponse> {
  const body = {
    analysis_id: analysisId,
    latitude: lat,
    longitude: lng,
    address,
    system_size_kw: systemSizeKw,
    annual_generation_kwh: annualGenerationKwh,
    state,
    zip_code: zipCode,
  };

  const res = await fetch(`${API_BASE}/api/v1/agents/incentives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Incentives fetch failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Request a Gemini-generated narrative summary of the analysis.
 */
export async function generateNarrativeSummary(
  payload: {
    analysis_id: string;
    location: URJALINKLocation;
    solar_potential: Record<string, unknown>;
    financial_outlook: Record<string, unknown>;
  },
  options?: { signal?: AbortSignal },
): Promise<SummaryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Summary generation failed (${res.status}): ${detail}`);
  }

  return res.json();
}

/**
 * Upload an electricity bill PDF for before/after comparison.
 */
export async function uploadBillForComparison(
  file: File,
  firstYearSavingsNet: number,
  paybackPeriodYears: number,
  monthlySavings: number,
): Promise<BillComparisonResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("first_year_savings_net", String(firstYearSavingsNet));
  formData.append("payback_period_years", String(paybackPeriodYears));
  formData.append("monthly_savings", String(monthlySavings));

  const res = await fetch(`${API_BASE}/api/v1/bill-comparison`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Bill comparison failed (${res.status}): ${detail}`);
  }

  return res.json();
}
