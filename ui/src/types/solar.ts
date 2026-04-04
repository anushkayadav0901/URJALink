import type { Location } from "@/lib/api/models/Location";
import type { AnalysisResponse } from "@/lib/api/models/AnalysisResponse";
import type { SolarScoreBreakdown } from "@/lib/api/models/SolarScoreBreakdown";

export interface SolarStats {
  analysisId: string;
  location: Location;
  maxPanels: number;
  roofAreaSqft: number;
  usableAreaSqft: number;
  systemSizeKw: number;
  yearlyEnergyKwh: number;
  dailyEnergyKwh: number;
  systemCost: number;
  annualSavings: number;
  paybackYears: number;
  roi: number;
  carbonOffset: number;
  treesEquivalent: number;
  confidence: number;
  analysisType: string;
  orientation: string;
  polygonPoints: number;
  aiModel: string;
  sunshineHours: number;
  roofArea: number;
  tiltAngle: number;
  solarScore?: number;
  solarScoreBreakdown?: SolarScoreBreakdown;
  fullResponse: AnalysisResponse;
}

