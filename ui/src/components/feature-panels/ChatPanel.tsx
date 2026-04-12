import { useState } from "react";
import type { SolarStats } from "@/types/solar";

interface ChatPanelProps {
  stats: SolarStats;
}

type PromptKey = "best-plan" | "emi-vs-full" | "monthly-savings";

const suggestedPrompts: { key: PromptKey; label: string }[] = [
  { key: "best-plan", label: "Best plan for me" },
  { key: "emi-vs-full", label: "EMI vs full payment" },
  { key: "monthly-savings", label: "Monthly savings" },
];

function getAnswer(key: PromptKey, stats: SolarStats): string {
  const monthlySavings = stats.annualSavings / 12;
  const emi = stats.systemCost / 60;

  switch (key) {
    case "best-plan":
      return `Based on your rooftop analysis, a ${stats.systemSizeKw.toFixed(1)} kW system with ${stats.maxPanels} panels is the best fit. It costs ₹${Math.round(stats.systemCost).toLocaleString()} and pays for itself in ${stats.paybackYears} years. You'll save ₹${Math.round(stats.annualSavings).toLocaleString()} per year and earn ₹${Math.round(stats.fullResponse.financial_outlook.net_profit_25_years).toLocaleString()} in net profit over 25 years.`;

    case "emi-vs-full":
      return `Full payment: ₹${Math.round(stats.systemCost).toLocaleString()} upfront. You start saving immediately — ₹${Math.round(monthlySavings).toLocaleString()}/month from day one.\n\nEMI (5-year): ~₹${Math.round(emi).toLocaleString()}/month. Your monthly savings of ₹${Math.round(monthlySavings).toLocaleString()} ${monthlySavings > emi ? "cover the EMI, so the system essentially pays for itself" : "partially offset your EMI payments"}.`;

    case "monthly-savings":
      return `With solar, you save approximately ₹${Math.round(monthlySavings).toLocaleString()} per month on electricity. That's ₹${Math.round(stats.annualSavings).toLocaleString()} per year. Over 25 years, your total savings are ₹${Math.round(stats.fullResponse.financial_outlook.total_net_savings_25_years).toLocaleString()}.`;
  }
}

export const ChatPanel = ({ stats }: ChatPanelProps) => {
  const [activePrompt, setActivePrompt] = useState<PromptKey | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handlePromptClick = (key: PromptKey, label: string) => {
    setInputValue(label);
    setActivePrompt(key);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Suggested Prompts */}
      <div className="text-white/50 text-xs font-medium">Suggested Questions</div>
      <div className="flex flex-col gap-2">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt.key}
            onClick={() => handlePromptClick(prompt.key, prompt.label)}
            className={`text-left px-3 py-2 rounded-xl text-sm transition-colors ${
              activePrompt === prompt.key
                ? "bg-orange-500/20 border border-orange-500/30 text-orange-300"
                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about your solar analysis..."
          className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
          readOnly
        />
      </div>

      {/* Answer */}
      {activePrompt && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
            {getAnswer(activePrompt, stats)}
          </p>
        </div>
      )}
    </div>
  );
};
