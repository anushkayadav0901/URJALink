import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle,
  MessageCircle,
} from "lucide-react";
import type { SolarStats } from "@/types/solar";
import { StoryPanel } from "./StoryPanel";
import { SimulatePanel } from "./SimulatePanel";
import { FuturePanel } from "./FuturePanel";
import { DecisionPanel } from "./DecisionPanel";
import { ChatPanel } from "./ChatPanel";

export type PanelType =
  | "analysis"
  | "story"
  | "simulate"
  | "future"
  | "decision"
  | "chat"
  | null;

const menuItems: { id: PanelType; label: string; icon: React.ReactNode }[] = [
  { id: "analysis", label: "Analysis", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "story", label: "Story", icon: <BookOpen className="w-4 h-4" /> },
  { id: "simulate", label: "Simulate", icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: "future", label: "Future", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "decision", label: "Decision", icon: <CheckCircle className="w-4 h-4" /> },
  { id: "chat", label: "Chat", icon: <MessageCircle className="w-4 h-4" /> },
];

interface FeaturePanelProps {
  stats: SolarStats;
}

export const FeaturePanel = ({ stats }: FeaturePanelProps) => {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const handleMenuClick = (id: PanelType) => {
    if (id === "analysis") {
      // Analysis is the main dashboard, just close any open panel
      setActivePanel(null);
      return;
    }
    setActivePanel((prev) => (prev === id ? null : id));
  };

  return (
    <>
      {/* Left Side Menu */}
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-3"
        style={{ width: 200 }}
      >
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider px-3 py-1">
          Features
        </div>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleMenuClick(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activePanel === item.id
                ? "bg-white/15 text-white"
                : item.id === "analysis" && activePanel === null
                  ? "bg-white/10 text-white/80"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Right Side Dynamic Panel */}
      {activePanel && activePanel !== "analysis" && (
        <div
          className="fixed right-4 top-1/2 -translate-y-1/2 z-[60] rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-5 overflow-y-auto"
          style={{ width: 380, maxHeight: "80vh" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-base capitalize">
              {activePanel}
            </h3>
            <button
              onClick={() => setActivePanel(null)}
              className="text-white/40 hover:text-white/80 text-sm"
            >
              ✕
            </button>
          </div>

          {activePanel === "story" && <StoryPanel stats={stats} />}
          {activePanel === "simulate" && <SimulatePanel stats={stats} />}
          {activePanel === "future" && <FuturePanel stats={stats} />}
          {activePanel === "decision" && <DecisionPanel stats={stats} />}
          {activePanel === "chat" && <ChatPanel stats={stats} />}
        </div>
      )}
    </>
  );
};
