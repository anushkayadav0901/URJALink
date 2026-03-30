import { motion } from "framer-motion";
import { EquityScoreBreakdown } from "@/lib/URJALINK-api";
import { categorizeEquityScore } from "@/lib/URJALINK-api";
import { equityScoreToColor, getEquityIcon, getEquityMessage, getEquityColorClass } from "@/lib/equity-colors";
import { Progress } from "@/components/ui/progress";

interface EquityScoreCardProps {
  score: EquityScoreBreakdown;
}

export const EquityScoreCard = ({ score }: EquityScoreCardProps) => {
  const category = categorizeEquityScore(score.total_score);
  const color = equityScoreToColor(score.total_score);
  const icon = getEquityIcon(score.total_score);
  const message = getEquityMessage(score.total_score);
  const colorClass = getEquityColorClass(score.total_score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
    >
      {/* Score Display */}
      <div className="flex items-center gap-6 mb-6">
        <div className="text-center">
          <div 
            className="text-6xl font-bold mb-2"
            style={{ color }}
          >
            {score.total_score.toFixed(1)}
            <span className="text-2xl ml-1 text-white/60">/100</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Energy Equity Score
          </h3>
          <p className="text-sm text-white/70">
            Your address score
          </p>
        </div>
      </div>

      {/* Category Alert */}
      <div className={`rounded-2xl border p-4 mb-6 ${colorClass}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm font-medium">
            {message}
          </span>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">
          Score Components
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <ScoreComponent 
            label="Income Access" 
            score={score.income_component} 
            max={40}
          />
          <ScoreComponent 
            label="Ownership" 
            score={score.ownership_component} 
            max={30}
          />
          <ScoreComponent 
            label="Energy Burden" 
            score={score.burden_component} 
            max={20}
          />
          <ScoreComponent 
            label="Solar Adoption" 
            score={score.adoption_component} 
            max={10}
          />
        </div>
      </div>

      {/* Barriers */}
      {score.barriers.length > 0 && (
        <div className="pt-6 border-t border-white/10">
          <h4 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider">
            Key Barriers to Solar Access
          </h4>
          <ul className="space-y-2">
            {score.barriers.map((barrier, idx) => (
              <li key={idx} className="text-sm text-white/70 flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>{barrier}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
};

interface ScoreComponentProps { 
  label: string; 
  score: number; 
  max: number;
}

const ScoreComponent = ({ label, score, max }: ScoreComponentProps) => {
  const percentage = (score / max) * 100;
  
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-bold text-white">
          {score.toFixed(1)}/{max}
        </span>
      </div>
      <Progress 
        value={percentage} 
        className="h-2 bg-white/10"
      />
    </div>
  );
};