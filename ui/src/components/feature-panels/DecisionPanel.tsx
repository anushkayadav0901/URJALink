import { useState } from "react";
import type { SolarStats } from "@/types/solar";

interface DecisionPanelProps {
  stats: SolarStats;
}

export const DecisionPanel = ({ stats }: DecisionPanelProps) => {
  const [showPlan, setShowPlan] = useState(false);

  const solarScore = stats.solarScore ?? 0;
  const paybackYears = stats.paybackYears;
  const monthlySavings = stats.annualSavings / 12;
  const energyOffset = stats.fullResponse.solar_potential?.energy_offset_percent ?? 0;

  const recommendation =
    solarScore > 75 && paybackYears < 8
      ? "Install Solar ✅"
      : "Consider Solar";

  // Plan calculation
  const emi = stats.systemCost / 60; // 5-year EMI

  return (
    <div className="flex flex-col gap-5">
      {/* Recommendation */}
      <div className="text-center py-3">
        <div className="text-2xl font-bold text-white mb-1">
          {recommendation}
        </div>
        <div className="text-white/50 text-xs">
          Solar Score: {solarScore}/100
        </div>
      </div>

      {/* Key Metrics */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
          <span className="text-white/60 text-xs">Payback Period</span>
          <span className="text-white font-semibold">{paybackYears} years</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
          <span className="text-white/60 text-xs">Monthly Savings</span>
          <span className="text-white font-semibold">
            ₹{Math.round(monthlySavings).toLocaleString()}
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
          <span className="text-white/60 text-xs">Energy Coverage</span>
          <span className="text-white font-semibold">{Math.round(energyOffset)}%</span>
        </div>
      </div>

      {/* Find Best Plan */}
      {!showPlan ? (
        <button
          onClick={() => setShowPlan(true)}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
        >
          Find Best Plan for Me
        </button>
      ) : (
        <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
          <div className="text-white font-semibold text-sm mb-1">
            Recommended Plan
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
            <span className="text-white/60 text-xs">Recommended Panels</span>
            <span className="text-white font-semibold">{stats.maxPanels}</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
            <span className="text-white/60 text-xs">EMI (5-year plan)</span>
            <span className="text-white font-semibold">
              ₹{Math.round(emi).toLocaleString()}/mo
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
            <span className="text-white/60 text-xs">Total System Cost</span>
            <span className="text-white font-semibold">
              ₹{Math.round(stats.systemCost).toLocaleString()}
            </span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex justify-between items-center">
            <span className="text-white/60 text-xs">Payback</span>
            <span className="text-white font-semibold">{paybackYears} years</span>
          </div>
          <p className="text-white/40 text-xs">
            EMI is approximate. Actual financing terms may vary.
          </p>
        </div>
      )}
    </div>
  );
};
