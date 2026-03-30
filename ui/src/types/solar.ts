import type { URJALINKLocation, URJALINKResponse, SolarScoreBreakdown } from "@/lib/URJALINK-api";

export interface SolarStats {
  analysisId: string;
  location: URJALINKLocation;
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
  fullResponse: URJALINKResponse;
}
