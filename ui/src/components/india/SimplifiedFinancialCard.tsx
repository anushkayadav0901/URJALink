import { useState } from "react";
import { DollarSign, TrendingUp, Zap, AlertCircle, Info } from "lucide-react";
import { FinancingOptions, type FinancingOption } from "./FinancingOptions";
import { InvestmentBreakdownModal } from "./InvestmentBreakdownModal";
import { PeopleLikeYou } from "./PeopleLikeYou";

interface SimplifiedFinancialCardProps {
  initialPanels: number;
  systemSizeKw: number;
  yearlyEnergyKwh: number;
  systemCostUSD: number;
  annualSavingsUSD: number;
  paybackYears: number;
  showSlider?: boolean; // For simulate mode
}

export const SimplifiedFinancialCard = ({
  initialPanels,
  systemSizeKw,
  yearlyEnergyKwh,
  systemCostUSD,
  annualSavingsUSD,
  paybackYears,
  showSlider = false,
}: SimplifiedFinancialCardProps) => {
  const [panelCount, setPanelCount] = useState(initialPanels);
  const [viewMode, setViewMode] = useState<"monthly" | "yearly">("monthly");
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [selectedFinancing, setSelectedFinancing] = useState<FinancingOption>("full");

  // USD to INR conversion
  const USD_TO_INR = 83;
  const usdToINR = (usd: number) => Math.round(usd * USD_TO_INR);

  // Calculate adjusted values based on panel count
  const ratio = panelCount / initialPanels;
  const adjustedSystemSizeKw = systemSizeKw * ratio;
  const adjustedYearlyEnergyKwh = Math.round(yearlyEnergyKwh * ratio);
  const adjustedSystemCostINR = usdToINR(systemCostUSD * ratio);
  const adjustedAnnualSavingsINR = usdToINR(annualSavingsUSD * ratio);
  const adjustedMonthlySavingsINR = Math.round(adjustedAnnualSavingsINR / 12);

  // Realistic India pricing (₹50-60 per watt installed)
  const realisticSystemCostINR = Math.round(adjustedSystemSizeKw * 1000 * 55);
  const realisticMonthlySavingsINR = Math.round(adjustedYearlyEnergyKwh * 6 / 12); // ₹6/kWh avg
  const realisticAnnualSavingsINR = realisticMonthlySavingsINR * 12;
  const realisticPaybackYears = Math.round((realisticSystemCostINR / realisticAnnualSavingsINR) * 10) / 10;

  // Calculate electricity bill coverage (assuming avg Indian household bill ₹2000-3000/month)
  const avgHouseholdBill = 2500;
  const billCoveragePercent = Math.min(100, Math.round((realisticMonthlySavingsINR / avgHouseholdBill) * 100));

  // Calculate delay loss (5 years)
  const delayLossINR = realisticAnnualSavingsINR * 5;

  // Calculate panel change impact (for simulate mode)
  const panelDiff = panelCount - initialPanels;
  const savingsPerPanel = realisticAnnualSavingsINR / initialPanels;
  const additionalSavings = Math.round(panelDiff * savingsPerPanel);

  // Bill impact calculation
  const currentMonthlyBill = 2500;
  const newMonthlyBill = Math.max(0, currentMonthlyBill - realisticMonthlySavingsINR);

  // Display values based on view mode
  const displaySavings = viewMode === "monthly" ? realisticMonthlySavingsINR : realisticAnnualSavingsINR;
  const displayLabel = viewMode === "monthly" ? "per month" : "per year";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-300" />
            Financial Outlook
          </h3>
          <p className="text-sm text-white/70">
            Simple breakdown for your solar investment
          </p>
        </div>
      </div>

      {/* Panel Slider */}
      {showSlider && (
        <>
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-white/80">
                Number of Panels
              </label>
              <span className="text-2xl font-bold text-white">{panelCount}</span>
            </div>
            <input
              type="range"
              min={Math.max(10, Math.floor(initialPanels * 0.5))}
              max={Math.min(20, Math.ceil(initialPanels * 1.5))}
              value={panelCount}
              onChange={(e) => setPanelCount(Number(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-white/60 mt-2">
              <span>{Math.max(10, Math.floor(initialPanels * 0.5))} panels</span>
              <span>{Math.min(20, Math.ceil(initialPanels * 1.5))} panels</span>
            </div>
            <p className="text-xs text-white/60 mt-2">
              System Size: {adjustedSystemSizeKw.toFixed(1)} kW
            </p>
          </div>

          {/* Panel Change Impact */}
          {panelDiff !== 0 && (
            <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-200 mb-1">
                    Impact of {panelDiff > 0 ? "Adding" : "Removing"} {Math.abs(panelDiff)} Panels
                  </p>
                  <p className="text-xs text-blue-100/80">
                    {panelDiff > 0 ? "+" : ""}₹{additionalSavings.toLocaleString("en-IN")}/year in savings
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bill Impact */}
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-sm font-semibold text-emerald-200 mb-2">Bill Impact</p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-emerald-100/70 mb-1">Current Bill</p>
            <p className="text-xl font-bold text-white">₹{currentMonthlyBill}</p>
          </div>
          <div className="text-emerald-300">→</div>
          <div className="flex-1">
            <p className="text-xs text-emerald-100/70 mb-1">After Solar</p>
            <p className="text-xl font-bold text-emerald-300">₹{newMonthlyBill}</p>
          </div>
        </div>
        <p className="text-xs text-emerald-100/70 mt-2">per month</p>
      </div>

      {/* Monthly/Yearly Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              viewMode === "monthly"
                ? "bg-white text-slate-900"
                : "text-white/70 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode("yearly")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              viewMode === "yearly"
                ? "bg-white text-slate-900"
                : "text-white/70 hover:text-white"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Simplified Metrics */}
      <div className="grid gap-4 mb-6">
        {/* Savings */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-400/20 to-transparent p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            <p className="text-sm font-medium text-white/80 uppercase tracking-wider">
              You Save
            </p>
          </div>
          <p className="text-4xl font-bold text-emerald-300">
            ₹{displaySavings.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-white/70 mt-1">{displayLabel}</p>
        </div>

        {/* Simple Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
              System Cost
            </p>
            <p className="text-2xl font-bold text-white">
              ₹{(realisticSystemCostINR / 100000).toFixed(1)}L
            </p>
            <p className="text-xs text-white/60 mt-1">
              ₹{Math.round(realisticSystemCostINR / adjustedSystemSizeKw).toLocaleString("en-IN")}/kW
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
              Break-even
            </p>
            <p className="text-2xl font-bold text-white">
              {realisticPaybackYears} yrs
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
              {billCoveragePercent}%
            </p>
            <p className="text-xs text-white/60 mt-1">
              of electricity bill
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
              Energy Output
            </p>
            <p className="text-2xl font-bold text-white">
              {Math.round(adjustedYearlyEnergyKwh / 12).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-white/60 mt-1">
              kWh per month
            </p>
          </div>
        </div>
      </div>

      {/* Delay Loss Warning */}
      <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-200 mb-1">
              Cost of Waiting
            </p>
            <p className="text-xs text-orange-100/80">
              If you delay by 5 years, you may lose ₹
              {(delayLossINR / 100000).toFixed(1)}L in potential savings
            </p>
          </div>
        </div>
      </div>

      {/* Financing Options */}
      <FinancingOptions
        systemCostINR={realisticSystemCostINR}
        onFinancingChange={setSelectedFinancing}
      />

      {/* Investment Breakdown Button */}
      <button
        onClick={() => setShowInvestmentModal(true)}
        className="mt-4 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        View Investment Breakdown
      </button>

      {/* People Like You */}
      <PeopleLikeYou
        systemSizeKw={adjustedSystemSizeKw}
        annualSavingsINR={realisticAnnualSavingsINR}
      />

      {/* Investment Breakdown Modal */}
      <InvestmentBreakdownModal
        isOpen={showInvestmentModal}
        onClose={() => setShowInvestmentModal(false)}
        systemCostINR={realisticSystemCostINR}
        systemSizeKw={adjustedSystemSizeKw}
      />
    </div>
  );
};
