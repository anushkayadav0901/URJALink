import { useState, useMemo } from "react";
import type { SolarStats } from "@/types/solar";

// Demo mode flag - set to false when backend is ready
export const DEMO_MODE = true;

// USD to INR conversion rate
const USD_TO_INR = 83;

export const useSolarEnhancements = (initialStats: SolarStats | null) => {
  const [adjustedPanels, setAdjustedPanels] = useState(
    initialStats?.maxPanels || 20
  );
  const [is25YearView, setIs25YearView] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  // Calculate adjusted stats based on panel count
  const adjustedStats = useMemo(() => {
    if (!initialStats) return null;

    const ratio = adjustedPanels / initialStats.maxPanels;

    return {
      ...initialStats,
      maxPanels: adjustedPanels,
      systemSizeKw: initialStats.systemSizeKw * ratio,
      yearlyEnergyKwh: Math.round(initialStats.yearlyEnergyKwh * ratio),
      dailyEnergyKwh: initialStats.dailyEnergyKwh * ratio,
      annualSavings: Math.round(initialStats.annualSavings * ratio),
      systemCost: Math.round(initialStats.systemCost * ratio),
      paybackYears: initialStats.paybackYears,
      roi: initialStats.roi,
      carbonOffset: Math.round(initialStats.carbonOffset * ratio),
      treesEquivalent: Math.round(initialStats.treesEquivalent * ratio),
    };
  }, [initialStats, adjustedPanels]);

  const usdToINR = (usd: number) => Math.round(usd * USD_TO_INR);

  const calculateLoss = () => {
    if (!adjustedStats) return 0;
    return usdToINR(adjustedStats.annualSavings * 10);
  };

  const getTimelineValue = (todayValue: number, multiplier: number = 25) => {
    return is25YearView ? todayValue * multiplier : todayValue;
  };

  return {
    adjustedPanels,
    setAdjustedPanels,
    adjustedStats,
    is25YearView,
    setIs25YearView,
    showInsightsModal,
    setShowInsightsModal,
    usdToINR,
    calculateLoss,
    getTimelineValue,
  };
};
