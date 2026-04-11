import { AlertTriangle } from "lucide-react";
import { generateSolarStory, type SolarStoryData } from "./solarStoryGenerator";

interface StoryContentProps {
  systemSizeKw: number;
  yearlyEnergyKwh: number;
  annualSavingsINR: number;
  paybackYears: number;
  systemCostINR: number;
  carbonOffsetKg: number;
  sunshineHours: number;
  panelCount: number;
  solarScore: number;
  roofAreaSqft: number;
  totalProfitINR: number;
}

export const StoryContent = ({
  systemSizeKw,
  yearlyEnergyKwh,
  annualSavingsINR,
  paybackYears,
  systemCostINR,
  carbonOffsetKg,
  sunshineHours,
  panelCount,
  solarScore,
  roofAreaSqft,
  totalProfitINR,
}: StoryContentProps) => {
  const storyData: SolarStoryData = {
    solarScore,
    paybackYears,
    yearlySavingsINR: annualSavingsINR,
    totalProfitINR,
    co2ReductionTons: carbonOffsetKg / 1000,
    systemSizeKw,
    panelCount,
    sunlightHours: sunshineHours,
    systemCostINR,
    yearlyEnergyKwh,
    roofAreaSqft,
  };

  const story = generateSolarStory(storyData);
  const delayLoss5yr = annualSavingsINR * 5;

  const recommendationBadge: Record<typeof story.recommendation, string> = {
    strong: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
    good: "bg-blue-500/20 border-blue-500/40 text-blue-200",
    moderate: "bg-yellow-500/20 border-yellow-500/40 text-yellow-200",
    low: "bg-red-500/20 border-red-500/40 text-red-200",
  };

  const recommendationLabel: Record<typeof story.recommendation, string> = {
    strong: "Strong Recommendation",
    good: "Good Opportunity",
    moderate: "Moderate Potential",
    low: "Low Potential",
  };

  return (
    <div className="space-y-5">
      {/* Headline card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-base font-semibold leading-snug text-white">
            {story.headline}
          </p>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${recommendationBadge[story.recommendation]}`}
          >
            {recommendationLabel[story.recommendation]}
          </span>
        </div>
      </div>

      {/* Story sections */}
      {story.sections.map((section) => (
        <div
          key={section.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-white/90">
              {section.heading}
            </h3>
            {section.highlight && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  {section.highlight.label}
                </p>
                <p className="text-lg font-bold text-white leading-tight">
                  {section.highlight.value}
                </p>
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed text-white/75">
            {section.body}
          </p>
        </div>
      ))}

      {/* Cost of waiting */}
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-orange-300 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-200 mb-1">
              Cost of Waiting
            </p>
            <p className="text-xs text-orange-100/80">
              Delaying solar by 5 years means missing out on approximately{" "}
              <span className="font-bold text-orange-200">
                ₹{Math.round(delayLoss5yr / 1000)}k
              </span>{" "}
              in potential savings.
            </p>
          </div>
        </div>
      </div>

      {/* Closing line */}
      <p className="text-center text-xs text-white/50 pb-2">
        {story.closingLine}
      </p>
    </div>
  );
};
