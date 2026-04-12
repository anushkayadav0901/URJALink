import { useState } from "react";
import type { SolarStats } from "@/types/solar";

interface FuturePanelProps {
  stats: SolarStats;
}

export const FuturePanel = ({ stats }: FuturePanelProps) => {
  const [year, setYear] = useState(Math.ceil(stats.paybackYears));
  const annualSavings = stats.annualSavings;
  const systemCost = stats.systemCost;

  const totalSavings = annualSavings * year;
  const profit = totalSavings - systemCost;
  const isProfit = profit >= 0;

  // Before / After toggle
  const [showSolar, setShowSolar] = useState(true);
  const monthlySavings = annualSavings / 12;
  // Estimate current bill from savings and coverage
  const energyOffset = stats.fullResponse.solar_potential?.energy_offset_percent ?? 100;
  const estimatedMonthlyBill = energyOffset > 0 ? (monthlySavings / (energyOffset / 100)) : monthlySavings * 2;
  const withSolar = estimatedMonthlyBill - monthlySavings;

  // Loss insight
  const lossOver5Years = annualSavings * 5;

  return (
    <div className="flex flex-col gap-5">
      {/* Year Slider */}
      <div>
        <label className="text-white/60 text-xs font-medium block mb-2">
          Project into Future
        </label>
        <input
          type="range"
          min={0}
          max={25}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-white/40 text-xs mt-1">
          <span>Year 0</span>
          <span className="text-white font-semibold text-sm">Year {year}</span>
          <span>Year 25</span>
        </div>
      </div>

      {/* Projection */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/50 text-xs">Break-even Point</div>
          <div className="text-white font-semibold">
            Year {stats.paybackYears}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/50 text-xs">Total Savings by Year {year}</div>
          <div className="text-white font-semibold text-lg">
            ₹{Math.round(totalSavings).toLocaleString()}
          </div>
        </div>
        <div
          className={`rounded-xl border p-3 ${
            isProfit
              ? "border-green-500/30 bg-green-500/10"
              : "border-red-500/30 bg-red-500/10"
          }`}
        >
          <div className="text-white/50 text-xs">
            {isProfit ? "Net Profit" : "Net Cost"} at Year {year}
          </div>
          <div
            className={`font-semibold text-lg ${
              isProfit ? "text-green-400" : "text-red-400"
            }`}
          >
            {isProfit ? "+" : "-"}₹{Math.abs(Math.round(profit)).toLocaleString()}
          </div>
        </div>
      </div>

      <p className="text-white/50 text-xs">
        Electricity prices are expected to increase over time, meaning actual savings could be higher.
      </p>

      {/* Before / After Toggle */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-white/60 text-xs font-medium mb-2">
          Monthly Bill Comparison
        </div>
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          <button
            onClick={() => setShowSolar(false)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              !showSolar
                ? "bg-white/15 text-white"
                : "bg-transparent text-white/50 hover:text-white/70"
            }`}
          >
            Without Solar
          </button>
          <button
            onClick={() => setShowSolar(true)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              showSolar
                ? "bg-white/15 text-white"
                : "bg-transparent text-white/50 hover:text-white/70"
            }`}
          >
            With Solar
          </button>
        </div>
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          {showSolar ? (
            <>
              <div className="text-white/50 text-xs mb-1">Monthly Bill (With Solar)</div>
              <div className="text-green-400 font-bold text-2xl">
                ₹{Math.round(withSolar).toLocaleString()}/mo
              </div>
              <div className="text-green-400/70 text-xs mt-1">
                You save ₹{Math.round(monthlySavings).toLocaleString()}/month
              </div>
            </>
          ) : (
            <>
              <div className="text-white/50 text-xs mb-1">Monthly Bill (Without Solar)</div>
              <div className="text-red-400 font-bold text-2xl">
                ₹{Math.round(estimatedMonthlyBill).toLocaleString()}/mo
              </div>
              <div className="text-white/40 text-xs mt-1">
                Current estimated electricity bill
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loss Insight */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-amber-300/90 text-xs leading-relaxed">
          If you delay solar by 5 years, you may lose ₹{Math.round(lossOver5Years).toLocaleString()} in potential savings.
        </p>
      </div>
    </div>
  );
};
