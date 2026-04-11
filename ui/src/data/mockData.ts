/**
 * Mock Data for Demo Mode
 * 
 * This data is used when DEMO_MODE = true
 * Provides realistic solar analysis results without backend API
 */

import type { AnalysisResponse } from "@/lib/URJALINK-api";

export const mockAnalysisResponse: AnalysisResponse = {
  analysis_id: "demo-analysis-" + Date.now(),
  timestamp: new Date().toISOString(),
  location: {
    latitude: 40.3573,
    longitude: -74.6672,
    address: "123 Demo Street, Princeton, NJ 08540",
  },
  roof_analysis: {
    total_area_sqft: 1200,
    usable_area_sqft: 1020,
    roof_segments: [
      {
        segment_id: 1,
        area_sqft: 1020,
        orientation_degrees: 180,
        orientation_cardinal: "South",
        tilt_degrees: 25,
        panel_capacity: 20,
        polygon: {
          coordinates: [
            [40.3574, -74.6673],
            [40.3574, -74.6671],
            [40.3572, -74.6671],
            [40.3572, -74.6673],
            [40.3574, -74.6673],
          ],
          area_sqft: 1020,
          confidence: 0.92,
        },
      },
    ],
    obstacles: {
      chimneys: 1,
      skylights: 0,
      trees_nearby: false,
      hvac_units: 1,
    },
    confidence_score: 0.92,
  },
  solar_data: {
    peak_sun_hours_daily: 5.2,
    annual_irradiance_kwh_m2: 1898,
    seasonal_variation: {
      summer_sun_hours: 6.8,
      winter_sun_hours: 3.6,
    },
  },
  solar_potential: {
    system_size_kw: 8.0,
    annual_generation_kwh: 10200,
    daily_generation_kwh: 27.9,
    capacity_factor: 0.145,
    energy_offset_percent: 85,
    co2_offset_tons_yearly: 7.14,
    co2_offset_tons_25year: 178,
    equivalent_trees_planted: 8,
  },
  solar_score: 82,
  solar_score_breakdown: {
    components: {
      roof_suitability: {
        score: 85.0,
        weight: 0.3,
        weighted_score: 25.5,
        details: "1020 sqft, South facing (×1.0)",
      },
      solar_irradiance: {
        score: 86.7,
        weight: 0.25,
        weighted_score: 21.7,
        details: "5.2 peak sun hours/day",
      },
      system_size: {
        score: 80.0,
        weight: 0.2,
        weighted_score: 16.0,
        details: "8.0 kW system",
      },
      capacity_factor: {
        score: 72.5,
        weight: 0.15,
        weighted_score: 10.9,
        details: "14.5% efficiency",
      },
      obstacles: {
        score: 80.0,
        weight: 0.1,
        weighted_score: 8.0,
        details: "2 penalty points",
      },
    },
    formula:
      "30% × Roof + 25% × Irradiance + 20% × Size + 15% × Efficiency + 10% × Clear Space",
  },
  financial_outlook: {
    system_cost_gross: 24000,
    federal_itc_amount: 7200,
    system_cost_net: 16800,
    cost_per_watt: 3.0,
    electricity_rate_current: 0.16,
    electricity_rate_year_25: 0.32,
    panel_degradation_rate: 0.005,
    electricity_inflation_rate: 0.03,
    maintenance_cost_annual: 240,
    dust_mitigation_cost_annual: 160,
    total_energy_generated_25_years: 242500,
    total_gross_savings_25_years: 48960,
    total_maintenance_costs_25_years: 6000,
    total_dust_mitigation_costs_25_years: 4000,
    total_operational_costs_25_years: 10000,
    total_net_savings_25_years: 38960,
    net_profit_25_years: 22160,
    payback_period_years: 7,
    roi_25_years: 131.9,
    first_year_savings_gross: 1632,
    first_year_savings_net: 1232,
    incentives: {
      federal_itc: {
        enabled: true,
        rate: 0.3,
        amount: 7200,
      },
    },
    yearly_breakdown: [
      {
        year: 1,
        generation_kwh: 10200,
        electricity_rate: 0.16,
        gross_savings: 1632,
        maintenance_cost: 240,
        dust_mitigation_cost: 160,
        net_savings: 1232,
      },
      {
        year: 2,
        generation_kwh: 10149,
        electricity_rate: 0.165,
        gross_savings: 1675,
        maintenance_cost: 240,
        dust_mitigation_cost: 160,
        net_savings: 1275,
      },
      {
        year: 3,
        generation_kwh: 10098,
        electricity_rate: 0.17,
        gross_savings: 1717,
        maintenance_cost: 240,
        dust_mitigation_cost: 160,
        net_savings: 1317,
      },
      {
        year: 4,
        generation_kwh: 10048,
        electricity_rate: 0.175,
        gross_savings: 1758,
        maintenance_cost: 240,
        dust_mitigation_cost: 160,
        net_savings: 1358,
      },
      {
        year: 5,
        generation_kwh: 9998,
        electricity_rate: 0.18,
        gross_savings: 1800,
        maintenance_cost: 240,
        dust_mitigation_cost: 160,
        net_savings: 1400,
      },
    ],
  },
  equity_analysis: null,
};

// Helper to create mock data with custom coordinates
export const createMockAnalysisResponse = (
  latitude: number,
  longitude: number,
  address: string,
  userPolygon?: number[][]
): AnalysisResponse => {
  const response = { ...mockAnalysisResponse };
  
  response.analysis_id = "demo-analysis-" + Date.now();
  response.timestamp = new Date().toISOString();
  response.location = {
    latitude,
    longitude,
    address,
  };

  // If user provided polygon, use it
  if (userPolygon && userPolygon.length > 0) {
    response.roof_analysis.roof_segments[0].polygon = {
      coordinates: userPolygon,
      area_sqft: response.roof_analysis.usable_area_sqft,
      confidence: 0.95, // Higher confidence for user-drawn
    };
  }

  return response;
};

// Mock installers data
export const mockInstallersMarkdown = `
# Local Solar Installers

## 1. SunPower Solutions
- **Rating:** 4.8/5 ⭐
- **Experience:** 15+ years
- **Contact:** (555) 123-4567
- **Specialty:** Residential & Commercial
- **Website:** sunpowersolutions.com

## 2. Green Energy Pros
- **Rating:** 4.6/5 ⭐
- **Experience:** 10+ years
- **Contact:** (555) 234-5678
- **Specialty:** Residential
- **Website:** greenergypros.com

## 3. Solar Experts Inc
- **Rating:** 4.7/5 ⭐
- **Experience:** 12+ years
- **Contact:** (555) 345-6789
- **Specialty:** High-efficiency systems
- **Website:** solarexpertsinc.com
`;

// Mock incentives data
export const mockIncentivesMarkdown = `
# Available Solar Incentives

## Federal Incentives

### Federal Investment Tax Credit (ITC)
- **Amount:** 30% of system cost
- **Eligibility:** All residential solar installations
- **Deadline:** Through 2032

## State Incentives (New Jersey)

### NJ Clean Energy Program
- **Rebate:** Up to $1,000
- **Eligibility:** Residential systems
- **Application:** Through state portal

### Solar Renewable Energy Certificates (SRECs)
- **Value:** ~$90 per certificate
- **Duration:** 15 years
- **Estimated Annual:** $900-$1,200

## Utility Incentives

### PSE&G Solar Loan Program
- **Rate:** 0% APR for 7 years
- **Amount:** Up to $30,000
- **Eligibility:** PSE&G customers

### Net Metering
- **Benefit:** Full retail credit for excess generation
- **Availability:** All NJ utilities
`;
