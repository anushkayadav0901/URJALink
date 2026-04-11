import { BarChart3, BookOpen } from "lucide-react";

interface StoryModeToggleProps {
  isStoryMode: boolean;
  onToggle: (isStory: boolean) => void;
}

export const StoryModeToggle = ({ isStoryMode, onToggle }: StoryModeToggleProps) => {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 shadow-inner backdrop-blur-xl">
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
          !isStoryMode
            ? "bg-white text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.2)]"
            : "text-white/70 hover:text-white"
        }`}
      >
        <BarChart3 className="h-4 w-4" />
        Data View
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
          isStoryMode
            ? "bg-white text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.2)]"
            : "text-white/70 hover:text-white"
        }`}
      >
        <BookOpen className="h-4 w-4" />
        Story View
      </button>
    </div>
  );
};