import { BarChart3, Sliders, Clock, Brain, Lightbulb } from "lucide-react";

export type ViewMode = "analysis" | "simulate" | "future" | "decision" | "insights";

interface ModePanelProps {
  activeMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export const ModePanel = ({ activeMode, onModeChange }: ModePanelProps) => {
  const modes = [
    {
      id: "analysis" as ViewMode,
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Analysis",
      description: "View your solar data",
    },
    {
      id: "simulate" as ViewMode,
      icon: <Sliders className="h-5 w-5" />,
      label: "Simulate",
      description: "Adjust panel count",
    },
    {
      id: "future" as ViewMode,
      icon: <Clock className="h-5 w-5" />,
      label: "Future",
      description: "Project over time",
    },
    {
      id: "decision" as ViewMode,
      icon: <Brain className="h-5 w-5" />,
      label: "Decision",
      description: "What should you do?",
    },
    {
      id: "insights" as ViewMode,
      icon: <Lightbulb className="h-5 w-5" />,
      label: "Insights",
      description: "Understand your potential",
    },
  ];

  return (
    <div className="w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-2">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
          Experience Mode
        </h3>
        <p className="text-xs text-white/60">
          Choose how you want to explore
        </p>
      </div>

      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`w-full flex items-start gap-3 rounded-xl p-3 text-left transition ${
            activeMode === mode.id
              ? "bg-emerald-500/20 border border-emerald-500/50"
              : "bg-white/5 border border-white/10 hover:bg-white/10"
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
              activeMode === mode.id
                ? "bg-emerald-500/30 text-emerald-300"
                : "bg-white/10 text-white/70"
            }`}
          >
            {mode.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${
                activeMode === mode.id ? "text-emerald-300" : "text-white"
              }`}
            >
              {mode.label}
            </p>
            <p className="text-xs text-white/60 mt-0.5">{mode.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
