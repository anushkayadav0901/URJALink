import type { SolarStats } from "@/types/solar";

interface StoryPanelProps {
  stats: SolarStats;
}

function generateSolarStory(stats: SolarStats): string[] {
  const annualSavings = stats.annualSavings;
  const totalProfit = stats.fullResponse.financial_outlook.net_profit_25_years;
  const co2Tons = stats.carbonOffset / 1000; // stored as kg
  const recommendation =
    (stats.solarScore ?? 0) > 75
      ? "Your rooftop is highly suitable for solar"
      : (stats.solarScore ?? 0) > 50
        ? "Your rooftop has good solar potential"
        : "Solar may still be beneficial with the right setup";

  return [
    `Your rooftop receives ${stats.sunshineHours.toFixed(1)} hours of peak sunlight per day, making it suitable for solar installation.`,
    `You can install a ${stats.systemSizeKw.toFixed(1)} kW system using approximately ${stats.maxPanels} panels.`,
    `This system can generate around ${Math.round(stats.yearlyEnergyKwh).toLocaleString()} kWh annually, saving you ₹${Math.round(annualSavings).toLocaleString()} per year.`,
    `Your investment is expected to break even in ${stats.paybackYears} years.`,
    `Over 25 years, you can earn approximately ₹${Math.round(totalProfit).toLocaleString()} in net profit.`,
    `This setup will reduce ${co2Tons.toFixed(1)} tons of CO₂ emissions annually — equivalent to planting ${stats.treesEquivalent} trees.`,
    `Recommendation: ${recommendation}.`,
  ];
}

export const StoryPanel = ({ stats }: StoryPanelProps) => {
  const paragraphs = generateSolarStory(stats);

  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-white/80 text-sm leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  );
};
