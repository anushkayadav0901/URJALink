import { useState } from "react";

interface TimelineToggleProps {
  onToggle: (is25Years: boolean) => void;
}

export const TimelineToggle = ({ onToggle }: TimelineToggleProps) => {
  const [is25Years, setIs25Years] = useState(false);

  const handleToggle = (value: boolean) => {
    setIs25Years(value);
    onToggle(value);
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
      <button
        onClick={() => handleToggle(false)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
          !is25Years
            ? "bg-white text-slate-900"
            : "text-white/70 hover:text-white"
        }`}
      >
        Today
      </button>
      <button
        onClick={() => handleToggle(true)}
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
          is25Years
            ? "bg-white text-slate-900"
            : "text-white/70 hover:text-white"
        }`}
      >
        25 Years
      </button>
    </div>
  );
};
