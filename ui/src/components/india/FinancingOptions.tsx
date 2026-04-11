import { useState } from "react";
import { CreditCard, Wallet, Gift } from "lucide-react";

interface FinancingOptionsProps {
  systemCostINR: number;
  onFinancingChange: (option: FinancingOption) => void;
}

export type FinancingOption = "full" | "emi" | "subsidy";

interface FinancingDetails {
  upfrontCost: number;
  monthlyEMI: number;
  tenure: number;
  totalCost: number;
}

export const FinancingOptions = ({
  systemCostINR,
  onFinancingChange,
}: FinancingOptionsProps) => {
  const [selected, setSelected] = useState<FinancingOption>("full");

  // Calculate financing details
  const subsidyAmount = systemCostINR * 0.3; // 30% subsidy
  const emiRate = 0.09; // 9% annual interest
  const emiTenure = 5; // 5 years

  const calculateEMI = (principal: number, rate: number, years: number) => {
    const monthlyRate = rate / 12;
    const months = years * 12;
    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
  };

  const financingDetails: Record<FinancingOption, FinancingDetails> = {
    full: {
      upfrontCost: systemCostINR,
      monthlyEMI: 0,
      tenure: 0,
      totalCost: systemCostINR,
    },
    emi: {
      upfrontCost: 0,
      monthlyEMI: calculateEMI(systemCostINR, emiRate, emiTenure),
      tenure: emiTenure,
      totalCost: calculateEMI(systemCostINR, emiRate, emiTenure) * emiTenure * 12,
    },
    subsidy: {
      upfrontCost: systemCostINR - subsidyAmount,
      monthlyEMI: 0,
      tenure: 0,
      totalCost: systemCostINR - subsidyAmount,
    },
  };

  const handleSelect = (option: FinancingOption) => {
    setSelected(option);
    onFinancingChange(option);
  };

  const options = [
    {
      id: "full" as FinancingOption,
      icon: <Wallet className="h-5 w-5" />,
      title: "Full Payment",
      description: "Pay upfront, save on interest",
      highlight: `₹${systemCostINR.toLocaleString("en-IN")}`,
    },
    {
      id: "emi" as FinancingOption,
      icon: <CreditCard className="h-5 w-5" />,
      title: "EMI Plan",
      description: "Easy monthly payments",
      highlight: `₹${financingDetails.emi.monthlyEMI.toLocaleString("en-IN")}/mo`,
    },
    {
      id: "subsidy" as FinancingOption,
      icon: <Gift className="h-5 w-5" />,
      title: "With Subsidy",
      description: "30% government subsidy",
      highlight: `₹${(systemCostINR - subsidyAmount).toLocaleString("en-IN")}`,
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-3">
        How can you install this?
      </p>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
              selected === option.id
                ? "border-green-500/50 bg-green-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                selected === option.id
                  ? "bg-green-500/20 text-green-300"
                  : "bg-white/10 text-white/70"
              }`}
            >
              {option.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{option.title}</p>
              <p className="text-xs text-white/60">{option.description}</p>
            </div>
            <p className="text-lg font-bold text-white">{option.highlight}</p>
          </button>
        ))}
      </div>

      {/* Selected Option Details */}
      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
        {selected === "full" && (
          <p>Pay ₹{systemCostINR.toLocaleString("en-IN")} upfront. No interest charges.</p>
        )}
        {selected === "emi" && (
          <p>
            ₹{financingDetails.emi.monthlyEMI.toLocaleString("en-IN")}/month for{" "}
            {emiTenure} years. Total: ₹
            {financingDetails.emi.totalCost.toLocaleString("en-IN")}
          </p>
        )}
        {selected === "subsidy" && (
          <p>
            30% subsidy (₹{subsidyAmount.toLocaleString("en-IN")}). Pay ₹
            {(systemCostINR - subsidyAmount).toLocaleString("en-IN")} after subsidy.
          </p>
        )}
      </div>
    </div>
  );
};
