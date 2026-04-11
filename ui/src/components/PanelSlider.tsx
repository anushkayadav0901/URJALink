import { useState } from "react";
import { Slider } from "@/components/ui/slider";

interface PanelSliderProps {
  initialPanels: number;
  minPanels?: number;
  maxPanels?: number;
  onPanelChange: (panels: number) => void;
}

export const PanelSlider = ({
  initialPanels,
  minPanels = 10,
  maxPanels = 25,
  onPanelChange,
}: PanelSliderProps) => {
  const [panels, setPanels] = useState(initialPanels);

  const handleChange = (value: number[]) => {
    const newPanels = value[0];
    setPanels(newPanels);
    onPanelChange(newPanels);
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">
          Adjust Panels
        </p>
        <p className="text-lg font-semibold text-white">{panels} panels</p>
      </div>
      <Slider
        value={[panels]}
        onValueChange={handleChange}
        min={minPanels}
        max={maxPanels}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between mt-2 text-xs text-white/50">
        <span>{minPanels}</span>
        <span>{maxPanels}</span>
      </div>
    </div>
  );
};
