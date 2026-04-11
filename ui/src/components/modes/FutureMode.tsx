import { useState } from "react";
import { TrendingUp, Zap, DollarSign, AlertCircle, Clock } from "lucide-react";

interface FutureModeProps {
  annualSavingsINR: number;
  systemCostINR: number;
  yearlyEnergyKwh: number;
}

export const FutureMode = ({
  annualSavingsINR,
  systemCostINR,
  yearlyEnergyKwh,
}: FutureModeProps) => {
  const [timeHorizon, setTimeHorizon] = useState<0 | 5 | 10 | 25>(0);

  const timeOptions = [
    { value: 0 as const, label: "Today" },
    { value: 5 as const, label: "5 Years" },
    { value: 10 as const, label: "10 Years" },
    { value: 25 as const, label: "25 Years" },
  ];

  // Calculate future values with electricity price escalation (4% per year)
  const escalationRate = 0.04;
  const calculateFutureValue = (years: number) => {
    if (years === 0) return annualSavingsINR;
    
    let totalSavings = 0;
    for (let year = 1; year <= years; year++) {
      const yearSavings = annualSavingsINR * Math.pow(1 + escalationRate, year - 1);
      totalSavings += yearSavings;
    }
    return Math.round(totalSavings);
  };

  const totalSavings = calculateFutureValue(timeHorizon);
  const netProfit = totalSavings - systemCostINR;
  const totalEnergy = yearlyEnergyKwh * timeHorizon;
  const priceIncrease = timeHorizon > 0 ? Math.round((Math.pow(1 + escalationRate, timeHorizon) - 1) * 100) : 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-6 w-6 text-emerald-300" />
        <h3 className="text-xl font-semibold">Future Projection</h3>
      </div>

      {/* Time Horizon Toggle */}
      <div className="mb-6">
        <p className="text-sm text-white/70 mb-3">Select time horizon</p>
        <div className="grid grid-cols-4 gap-2">
          {timeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeHorizon(option.value)}
              className={`px-4 py-3 rounded-xl text-sm font-semibold transition ${
                timeHorizon === option.value
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Increase Insight */}
      {timeHorizon > 0 && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-200 mb-1">
                Electricity Price Forecast
              </p>
              <p className="text-xs text-blue-100/80">
                In {timeHorizon} years, electricity prices may increase by ~{priceIncrease}%
                (assuming {escalationRate * 100}% annual growth)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Future Metrics */}
      <div className="space-y-4">
        {/* Total Savings */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-400/20 to-transparent p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            <p className="text-sm font-medium text-white/80 uppercase tracking-wider">
              {timeHorizon === 0 ? "Annual Savings" : "Total Savings"}
            </p>
          </div>
          <p className="text-4xl font-bold text-emerald-300">
            ₹{(totalSavings / 100000).toFixed(1)}L
          </p>
          <p className="text-sm text-white/70 mt-1">
            {timeHorizon === 0 ? "per year" : `over ${timeHorizon} years`}
          </p>
        </div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 gap-4">
          {timeHorizon > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
                Net Profit
              </p>
              <p className={`text-2xl font-bold ${netProfit > 0 ? "text-emerald-300" : "text-orange-300"}`}>
                ₹{(netProfit / 100000).toFixed(1)}L
              </p>
              <p className="text-xs text-white/60 mt-1">
                After system cost
              </p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
              Energy Generated
            </p>
            <p className="text-2xl font-bold text-white">
              {timeHorizon === 0
                ? yearlyEnergyKwh.toLocaleString("en-IN")
                : (totalEnergy / 1000).toFixed(0) + "k"}
            </p>
            <p className="text-xs text-white/60 mt-1">
              kWh {timeHorizon === 0 ? "per year" : "total"}
            </p>
          </div>

          {timeHorizon > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
                Cost Avoided
              </p>
              <p className="text-2xl font-bold text-white">
                ₹{(totalSavings / 100000).toFixed(1)}L
              </p>
              <p className="text-xs text-white/60 mt-1">
                Electricity bills
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison */}
      {timeHorizon > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-white/60 mb-3">Investment Comparison</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">System Cost</span>
              <span className="font-semibold text-white">
                ₹{(systemCostINR / 100000).toFixed(1)}L
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Total Returns</span>
              <span className="font-semibold text-emerald-300">
                ₹{(totalSavings / 100000).toFixed(1)}L
              </span>
            </div>
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold text-white">Net Gain</span>
                <span className="text-xl font-bold text-emerald-300">
                  ₹{(netProfit / 100000).toFixed(1)}L
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
