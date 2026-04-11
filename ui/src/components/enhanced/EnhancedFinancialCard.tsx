import { useState } from "react";
import { DollarSign, TrendingUp, Sliders, Clock, Info } from "lucide-react";

interface EnhancedFinancialCardProps {
  initialPanels: number;
  systemSizeKw: number;
  yearlyEnergyKwh: number;
  systemCostINR: number;
  annualSavingsINR: number;
  paybackYears: number;
}

export const EnhancedFinancialCard = ({
  initialPanels,
  systemSizeKw,
  yearlyEnergyKwh,
  systemCostINR,
  annualSavingsINR,
  paybackYears,
}: EnhancedFinancialCardProps) => {
  const [panelCount, setPanelCount] = useState(initialPanels);
  const [futureYear, setFutureYear] = useState(0);

  // Calculate adjusted values based on panel count
  const ratio = panelCount / initialPanels;
  const adjustedSystemSizeKw = systemSizeKw * ratio;
  const adjustedAnnualSavingsINR = Math.round(annualSavingsINR * ratio);
  const adjustedSystemCostINR = Math.round(systemCostINR * ratio);
  const adjustedPaybackYears = Math.round((adjustedSystemCostINR / adjustedAnnualSavingsINR) * 10) / 10;

  // Panel change impact
  const panelDiff = panelCount - initialPanels;
  const savingsPerPanel = Math.round(annualSavingsINR / initialPanels);

  // Future calculations
  const escalationRate = 0.04; // 4% annual electricity price increase
  const calculateFutureSavings = (years: number) => {
    if (years === 0) return adjustedAnnualSavingsINR;
    
    let totalSavings = 0;
    for (let year = 1; year <= years; year++) {
      const yearSavings = adjustedAnnualSavingsINR * Math.pow(1 + escalationRate, year - 1);
      totalSavings += yearSavings;
    }
    return Math.round(totalSavings);
  };

  const futureSavings = calculateFutureSavings(futureYear);
  const futureProfit = futureSavings - adjustedSystemCostINR;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="h-6 w-6 text-emerald-300" />
        <h3 className="text-xl font-semibold">Enhanced Financial Analysis</h3>
      </div>

      {/* What-if Panel Slider */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="h-4 w-4 text-white/70" />
          <label className="text-sm font-semibold text-white/80">
            What-if Analysis: Panel Count
          </label>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/60">Panels</span>
          <span className="text-2xl font-bold text-white">{panelCount}</span>
        </div>
        
        <input
          type="range"
          min={10}
          max={20}
          value={panelCount}
          onChange={(e) => setPanelCount(Number(e.target.value))}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        
        <div className="flex justify-between text-xs text-white/60 mt-2">
          <span>10 panels</span>
          <span>20 panels</span>
        </div>

        {panelDiff !== 0 && (
          <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-300" />
              <p className="text-sm text-blue-200">
                {panelDiff > 0 ? "+" : ""}{panelDiff} panel{Math.abs(panelDiff) !== 1 ? "s" : ""} {panelDiff > 0 ? "increases" : "decreases"} your savings by ₹{Math.abs(panelDiff * savingsPerPanel).toLocaleString("en-IN")}/year
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Current Financial Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
            System Cost
          </p>
          <p className="text-2xl font-bold text-white">
            ₹{(adjustedSystemCostINR / 100000).toFixed(1)}L
          </p>
          <p className="text-xs text-white/60 mt-1">
            {adjustedSystemSizeKw.toFixed(1)} kW system
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
            Annual Savings
          </p>
          <p className="text-2xl font-bold text-emerald-300">
            ₹{(adjustedAnnualSavingsINR / 1000).toFixed(0)}k
          </p>
          <p className="text-xs text-white/60 mt-1">
            ₹{Math.round(adjustedAnnualSavingsINR / 12).toLocaleString("en-IN")}/month
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
            Payback Period
          </p>
          <p className="text-2xl font-bold text-white">
            {adjustedPaybackYears} yrs
          </p>
          <p className="text-xs text-white/60 mt-1">
            Then pure profit
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
            Bill Coverage
          </p>
          <p className="text-2xl font-bold text-white">
            {Math.min(100, Math.round((adjustedAnnualSavingsINR / 12 / 2500) * 100))}%
          </p>
          <p className="text-xs text-white/60 mt-1">
            of electricity needs
          </p>
        </div>
      </div>

      {/* Future Vision Slider */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-white/70" />
          <label className="text-sm font-semibold text-white/80">
            Future Vision: Project Over Time
          </label>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/60">Year</span>
          <span className="text-2xl font-bold text-white">{futureYear}</span>
        </div>
        
        <input
          type="range"
          min={0}
          max={25}
          value={futureYear}
          onChange={(e) => setFutureYear(Number(e.target.value))}
          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        
        <div className="flex justify-between text-xs text-white/60 mt-2">
          <span>Today</span>
          <span>25 years</span>
        </div>

        {futureYear > 0 && (
          <div className="mt-4 space-y-2">
            {futureYear >= adjustedPaybackYears && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm text-emerald-200">
                  ✅ Break-even at year {adjustedPaybackYears}
                </p>
              </div>
            )}
            
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-white/60">Total Savings</p>
                  <p className="text-lg font-bold text-emerald-300">
                    ₹{(futureSavings / 100000).toFixed(1)}L
                  </p>
                </div>
                <div>
                  <p className="text-white/60">Net Profit</p>
                  <p className={`text-lg font-bold ${futureProfit > 0 ? "text-emerald-300" : "text-orange-300"}`}>
                    ₹{(futureProfit / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
            </div>

            {futureYear === 25 && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm text-emerald-200">
                  🎯 In 25 years, you may save ₹{(futureSavings / 100000).toFixed(1)}L
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Before vs After Toggle */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white/80 mb-3">Before vs After Solar</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-white/60 mb-2">Without Solar</p>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xl font-bold text-red-300">₹2,500</p>
              <p className="text-xs text-red-200">per month</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-white/60 mb-2">With Solar</p>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xl font-bold text-emerald-300">₹800</p>
              <p className="text-xs text-emerald-200">per month</p>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-emerald-300">
            Monthly Savings: ₹{Math.round(adjustedAnnualSavingsINR / 12).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </div>
  );
};