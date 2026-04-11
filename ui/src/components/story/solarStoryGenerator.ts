/**
 * Solar Story Generator
 *
 * Converts raw solar analysis data into a human-readable, personalized report.
 * Designed to be swappable with an LLM (Gemini/GPT) in the future.
 */

export interface SolarStoryData {
  solarScore: number;
  paybackYears: number;
  yearlySavingsINR: number;
  totalProfitINR: number;
  co2ReductionTons: number;
  systemSizeKw: number;
  panelCount: number;
  sunlightHours: number;
  systemCostINR: number;
  yearlyEnergyKwh: number;
  roofAreaSqft: number;
}

export interface SolarStorySection {
  id: string;
  heading: string;
  body: string;
  /** Key metric to highlight inline */
  highlight?: { label: string; value: string };
}

export interface SolarStory {
  headline: string;
  recommendation: "strong" | "good" | "moderate" | "low";
  sections: SolarStorySection[];
  closingLine: string;
}

// ─── Tone helpers ────────────────────────────────────────────────────────────

function sunlightQuality(hours: number): string {
  if (hours >= 6) return "excellent";
  if (hours >= 5) return "very good";
  if (hours >= 4) return "good";
  return "moderate";
}

function scoreLabel(score: number): string {
  if (score >= 85) return "exceptional";
  if (score >= 70) return "strong";
  if (score >= 55) return "solid";
  return "moderate";
}

function recommendation(score: number): SolarStory["recommendation"] {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 50) return "moderate";
  return "low";
}

function formatINR(amount: number): string {
  if (amount >= 10_00_000) {
    return `₹${(amount / 10_00_000).toFixed(1)} lakh`;
  }
  if (amount >= 1_000) {
    return `₹${Math.round(amount / 1_000)}k`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateSolarStory(data: SolarStoryData): SolarStory {
  const {
    solarScore,
    paybackYears,
    yearlySavingsINR,
    totalProfitINR,
    co2ReductionTons,
    systemSizeKw,
    panelCount,
    sunlightHours,
    systemCostINR,
    yearlyEnergyKwh,
    roofAreaSqft,
  } = data;

  const quality = sunlightQuality(sunlightHours);
  const label = scoreLabel(solarScore);
  const rec = recommendation(solarScore);
  const monthlySavings = Math.round(yearlySavingsINR / 12);
  const totalSavings25 = yearlySavingsINR * 25;
  const delayLoss5yr = yearlySavingsINR * 5;

  const headline =
    rec === "strong"
      ? `Your home is a ${label} candidate for solar — here's your personalised report.`
      : rec === "good"
        ? `Your home has a ${label} solar opportunity — here's what the numbers say.`
        : `Your home has ${label} solar potential — here's a full breakdown.`;

  const sections: SolarStorySection[] = [
    {
      id: "sunlight",
      heading: "☀️ Sunlight & Roof Suitability",
      body: `Your location receives approximately ${sunlightHours} hours of peak sunlight daily — that's ${quality} for solar generation. With ${Math.round(roofAreaSqft).toLocaleString("en-IN")} sqft of usable roof space, your home is well-positioned to capture a significant amount of clean energy throughout the year.`,
      highlight: { label: "Daily sunlight", value: `${sunlightHours} hrs` },
    },
    {
      id: "system",
      heading: "⚡ Your Recommended System",
      body: `Based on your roof analysis, a ${systemSizeKw.toFixed(1)} kW system using around ${panelCount} panels is recommended. This setup can generate approximately ${yearlyEnergyKwh.toLocaleString("en-IN")} kWh of electricity per year — enough to cover a large portion of your household's energy needs.`,
      highlight: { label: "System size", value: `${systemSizeKw.toFixed(1)} kW` },
    },
    {
      id: "savings",
      heading: "💰 Your Savings Potential",
      body: `This system can save you around ${formatINR(yearlySavingsINR)} per year, which works out to roughly ${formatINR(monthlySavings)} every month off your electricity bill. The total system investment of ${formatINR(systemCostINR)} is expected to pay for itself in about ${paybackYears} years — after which every rupee saved is pure gain.`,
      highlight: { label: "Yearly savings", value: formatINR(yearlySavingsINR) },
    },
    {
      id: "longterm",
      heading: "📈 Long-Term Financial Picture",
      body: `Over a 25-year period, your total gross savings could reach ${formatINR(totalSavings25)}. After accounting for the system cost, your estimated net profit stands at ${formatINR(totalProfitINR)}. If you delay installation by 5 years, you could miss out on approximately ${formatINR(delayLoss5yr)} in savings.`,
      highlight: { label: "25-yr net profit", value: formatINR(totalProfitINR) },
    },
    {
      id: "environment",
      heading: "🌱 Environmental Impact",
      body: `By going solar, you'll reduce your carbon emissions by approximately ${co2ReductionTons.toFixed(1)} tons of CO₂ every year. Over 25 years, that's ${(co2ReductionTons * 25).toFixed(0)} tons — equivalent to planting hundreds of trees and making a meaningful contribution to a cleaner future.`,
      highlight: { label: "CO₂ saved/year", value: `${co2ReductionTons.toFixed(1)} tons` },
    },
    {
      id: "verdict",
      heading: "🏆 Final Verdict",
      body: `Your solar potential score of ${solarScore}/100 places you in the "${label}" category. ${
        rec === "strong"
          ? "The numbers strongly support moving forward with solar — the payback is fast, the savings are real, and the environmental benefit is significant."
          : rec === "good"
            ? "Solar makes good financial sense for your home. The returns are solid and the environmental upside is a bonus."
            : "Solar is a viable option for your home. While the returns are moderate, the long-term savings and environmental benefits are still worthwhile."
      }`,
      highlight: { label: "Solar score", value: `${solarScore}/100` },
    },
  ];

  const closingLine =
    rec === "strong"
      ? "Now is a great time to get quotes from local installers and lock in today's incentives."
      : rec === "good"
        ? "Getting a few installer quotes is a smart next step to confirm these projections."
        : "Exploring financing options and available subsidies could make solar a practical choice for you.";

  return { headline, recommendation: rec, sections, closingLine };
}
