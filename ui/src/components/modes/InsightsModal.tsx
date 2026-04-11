import { X, Sun, Zap, TrendingUp, Leaf } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemSizeKw: number;
  yearlyEnergyKwh: number;
  annualSavingsINR: number;
  carbonOffsetKg: number;
}

export const InsightsModal = ({
  isOpen,
  onClose,
  systemSizeKw,
  yearlyEnergyKwh,
  annualSavingsINR,
  carbonOffsetKg,
}: InsightsModalProps) => {
  const insights = [
    {
      icon: <Sun className="h-8 w-8 text-yellow-300" />,
      title: "Sunlight Received",
      value: "~5.5 hours/day",
      description: "Your location receives excellent sunlight for solar generation",
    },
    {
      icon: <Zap className="h-8 w-8 text-blue-300" />,
      title: "Energy Generated",
      value: `${yearlyEnergyKwh.toLocaleString("en-IN")} kWh/year`,
      description: `Your ${systemSizeKw.toFixed(1)} kW system will generate enough to power your home`,
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-emerald-300" />,
      title: "Financial Savings",
      value: `₹${(annualSavingsINR / 1000).toFixed(0)}k/year`,
      description: "Significant reduction in your electricity bills",
    },
    {
      icon: <Leaf className="h-8 w-8 text-green-300" />,
      title: "Environmental Impact",
      value: `${(carbonOffsetKg / 1000).toFixed(1)} tons CO₂`,
      description: "Equivalent to planting ~50 trees every year",
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-[201]"
          >
            <div className="w-full max-w-2xl rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold">Your Solar Potential Explained</h3>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-white/70 mb-6">
                Here's a simple breakdown of what solar means for you
              </p>

              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 flex-shrink-0">
                        {insight.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold mb-1">{insight.title}</p>
                        <p className="text-2xl font-bold text-emerald-300 mb-2">
                          {insight.value}
                        </p>
                        <p className="text-sm text-white/70">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-200 mb-2">
                  Bottom Line
                </p>
                <p className="text-sm text-emerald-100/80">
                  Your roof has excellent solar potential. With a {systemSizeKw.toFixed(1)} kW
                  system, you'll save ₹{(annualSavingsINR / 1000).toFixed(0)}k annually while
                  reducing your carbon footprint significantly.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
