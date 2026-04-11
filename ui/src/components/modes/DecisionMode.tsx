import { CheckCircle, TrendingUp, Zap, ArrowRight, Brain } from "lucide-react";

interface DecisionModeProps {
  paybackYears: number;
  monthlySavingsINR: number;
  billCoveragePercent: number;
  systemCostINR: number;
}

export const DecisionMode = ({
  paybackYears,
  monthlySavingsINR,
  billCoveragePercent,
  systemCostINR,
}: DecisionModeProps) => {
  // Decision logic
  const shouldInstall = paybackYears < 10 && billCoveragePercent > 40;
  const recommendation = shouldInstall ? "strong" : "moderate";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-emerald-300" />
        <h3 className="text-xl font-semibold">Decision Recommendation</h3>
      </div>

      {/* Recommendation */}
      <div
        className={`rounded-2xl border p-6 mb-6 ${
          shouldInstall
            ? "border-emerald-500/50 bg-emerald-500/10"
            : "border-yellow-500/50 bg-yellow-500/10"
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle
            className={`h-8 w-8 ${shouldInstall ? "text-emerald-300" : "text-yellow-300"}`}
          />
          <div>
            <p className="text-2xl font-bold">
              {shouldInstall ? "Install Solar" : "Consider Solar"}
            </p>
            <p className="text-sm text-white/70">
              {recommendation === "strong" ? "Strong Recommendation" : "Moderate Recommendation"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white/90">Why this recommendation?</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/80">
                Payback period of {paybackYears} years is{" "}
                {paybackYears < 8 ? "excellent" : "good"}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/80">
                Saves ₹{monthlySavingsINR.toLocaleString("en-IN")}/month on electricity
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/80">
                Covers {billCoveragePercent}% of your electricity needs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What Should You Do Next */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-lg font-semibold mb-4">What should you do next?</p>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <span className="text-lg font-bold text-emerald-300">1</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Talk to Installers</p>
                <p className="text-xs text-white/60">Get quotes from local experts</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/40" />
          </button>

          <button className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <span className="text-lg font-bold text-emerald-300">2</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Choose Financing</p>
                <p className="text-xs text-white/60">EMI, Full Payment, or Subsidy</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/40" />
          </button>

          <button className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <span className="text-lg font-bold text-emerald-300">3</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Apply for Subsidy</p>
                <p className="text-xs text-white/60">Get 30% government subsidy</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/40" />
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs text-white/60 mb-2">Investment Summary</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-white/60">System Cost</p>
            <p className="text-lg font-bold text-white">
              ₹{(systemCostINR / 100000).toFixed(1)}L
            </p>
          </div>
          <div>
            <p className="text-xs text-white/60">Monthly Savings</p>
            <p className="text-lg font-bold text-emerald-300">
              ₹{monthlySavingsINR.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
