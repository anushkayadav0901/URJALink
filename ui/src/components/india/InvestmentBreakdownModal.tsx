import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InvestmentBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemCostINR: number;
  systemSizeKw: number;
}

export const InvestmentBreakdownModal = ({
  isOpen,
  onClose,
  systemCostINR,
  systemSizeKw,
}: InvestmentBreakdownModalProps) => {
  // Calculate breakdown
  const costPerKw = systemCostINR / systemSizeKw;
  const panelCost = systemCostINR * 0.45; // 45% panels
  const installationCost = systemCostINR * 0.25; // 25% installation
  const inverterCost = systemCostINR * 0.20; // 20% inverter
  const otherCosts = systemCostINR * 0.10; // 10% other
  const subsidyAmount = systemCostINR * 0.30; // 30% subsidy
  const netCost = systemCostINR - subsidyAmount;

  const breakdown = [
    { label: "Solar Panels", amount: panelCost, percent: 45 },
    { label: "Installation & Labor", amount: installationCost, percent: 25 },
    { label: "Inverter & Equipment", amount: inverterCost, percent: 20 },
    { label: "Other Costs", amount: otherCosts, percent: 10 },
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
            <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Investment Breakdown</h3>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* System Info */}
              <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm text-white/60">System Size</p>
                <p className="text-2xl font-bold">{systemSizeKw} kW</p>
                <p className="text-xs text-white/60 mt-1">
                  ₹{costPerKw.toLocaleString("en-IN")}/kW
                </p>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3 mb-4">
                <p className="text-sm font-semibold text-white/80">Cost Components</p>
                {breakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-white/60">{item.percent}% of total</p>
                    </div>
                    <p className="text-lg font-bold">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total & Subsidy */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Gross Cost</span>
                  <span className="font-semibold">
                    ₹{systemCostINR.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-green-300">
                  <span>Government Subsidy (30%)</span>
                  <span className="font-semibold">
                    - ₹{subsidyAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Net Cost</span>
                    <span className="text-xl font-bold">
                      ₹{netCost.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-white/60 mt-4 text-center">
                Prices include GST. Subsidy subject to government approval.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
