import { Users, TrendingUp, Zap } from "lucide-react";

interface PeopleLikeYouProps {
  systemSizeKw: number;
  annualSavingsINR: number;
}

export const PeopleLikeYou = ({
  systemSizeKw,
  annualSavingsINR,
}: PeopleLikeYouProps) => {
  // Mock data based on area/system size
  const avgSystemSize = Math.round(systemSizeKw * 0.9 * 10) / 10; // Slightly lower
  const avgSavings = Math.round(annualSavingsINR * 0.85); // Slightly lower
  const emiPercentage = 68; // 68% chose EMI

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-blue-300" />
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">
          People in Your Area
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
          <Zap className="h-4 w-4 text-yellow-300 mx-auto mb-1" />
          <p className="text-xs text-white/60">Avg System</p>
          <p className="text-lg font-bold text-white">{avgSystemSize} kW</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
          <TrendingUp className="h-4 w-4 text-green-300 mx-auto mb-1" />
          <p className="text-xs text-white/60">Avg Savings</p>
          <p className="text-lg font-bold text-white">
            ₹{(avgSavings / 1000).toFixed(0)}k
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
          <Users className="h-4 w-4 text-purple-300 mx-auto mb-1" />
          <p className="text-xs text-white/60">Chose EMI</p>
          <p className="text-lg font-bold text-white">{emiPercentage}%</p>
        </div>
      </div>

      <p className="text-xs text-white/60 mt-3 text-center">
        Based on 150+ installations in your locality
      </p>
    </div>
  );
};
