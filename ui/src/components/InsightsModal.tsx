import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sunlightHours: number;
  energyKwh: number;
  savingsINR: number;
  co2Tons: number;
}

export const InsightsModal = ({
  isOpen,
  onClose,
  sunlightHours,
  energyKwh,
  savingsINR,
  co2Tons,
}: InsightsModalProps) => {
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
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 backdrop-blur-2xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Key Insights</h3>
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/60">Sunlight</p>
                  <p className="text-2xl font-bold">{sunlightHours}h/day</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/60">Energy</p>
                  <p className="text-2xl font-bold">{energyKwh.toLocaleString()} kWh/year</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/60">Savings</p>
                  <p className="text-2xl font-bold">₹{savingsINR.toLocaleString()}/year</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-white/60">CO₂ Offset</p>
                  <p className="text-2xl font-bold">{co2Tons} tons</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
