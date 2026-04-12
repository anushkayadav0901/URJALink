import { useState } from "react";
import type { SolarStats } from "@/types/solar";

interface SimulatePanelProps {
  stats: SolarStats;
}

export const SimulatePanel = ({ stats }: SimulatePanelProps) => {
  const basePanels = stats.maxPanels;
  const baseSavings = stats.annualSavings;
  const baseCost = stats.systemCost;

  const minPanels = Math.max(1, Math.floor(basePanels * 0.4));
  const maxPanels = Math.ceil(basePanels * 1.5);

  const [selectedPanels, setSelectedPanels] = useState(basePanels);

  const factor = selectedPanels / basePanels;
  const newSavings = baseSavings * factor;
  const newCost = baseCost * factor;
  const payback = newSavings > 0 ? newCost / newSavings : 0;
  const savingsPerPanel = basePanels > 0 ? baseSavings / basePanels : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Slider */}
      <div>
        <label className="text-white/60 text-xs font-medium block mb-2">
          Number of Panels
        </label>
        <input
          type="range"
          min={minPanels}
          max={maxPanels}
          value={selectedPanels}
          onChange={(e) => setSelectedPanels(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-white/40 text-xs mt-1">
          <span>{minPanels}</span>
          <span className="text-white font-semibold text-sm">{selectedPanels} panels</span>
          <span>{maxPanels}</span>
        </div>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/50 text-xs">Estimated Annual Savings</div>
          <div className="text-white font-semibold text-lg">
            ₹{Math.round(newSavings).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/50 text-xs">Estimated System Cost</div>
          <div className="text-white font-semibold text-lg">
            ₹{Math.round(newCost).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-white/50 text-xs">Payback Period</div>
          <div className="text-white font-semibold text-lg">
            {payback.toFixed(1)} years
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <p className="text-white/60 text-xs">
          Each additional panel adds ~₹{Math.round(savingsPerPanel).toLocaleString()}/year in savings
        </p>
        <p className="text-white/60 text-xs">
          {selectedPanels > basePanels
            ? "More panels increase savings and reduce payback duration"
            : selectedPanels < basePanels
              ? "Fewer panels lower upfront cost but extend payback"
              : "This is your recommended configuration"}
        </p>
      </div>
    </div>
  );
};
