import { motion } from "framer-motion";
import { FileText, Send, Users, AlertTriangle } from "lucide-react";
import { EquityAnalysisResponse } from "@/lib/URJALINK-api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface EquityActionsPanelProps {
  equityData: EquityAnalysisResponse;
  userAddress: string;
}

export const EquityActionsPanel = ({
  equityData,
  userAddress,
}: EquityActionsPanelProps) => {
  const { toast } = useToast();

  const handleGenerateReport = () => {
    toast({
      title: "Generating Equity Report",
      description:
        "This feature will create a comprehensive PDF including detailed score breakdown, neighborhood comparison, and policy recommendations.",
    });
  };

  const handleRecommendToCouncil = () => {
    const subject = encodeURIComponent(
      `Solar Equity Analysis for ${equityData.area_description}`,
    );
    const body = encodeURIComponent(
      `Dear City Council Members,\n\n` +
        `I am writing to share important data about solar energy equity in our community.\n\n` +
        `Key Findings:\n` +
        `- ${equityData.solar_deserts_count} neighborhoods identified as "Solar Deserts" (equity score < 35)\n` +
        `- These areas have high solar potential but face systemic barriers\n` +
        `- Recommended actions: Targeted incentive programs, community solar development\n\n` +
        `Please see attached URJALINK equity report for detailed analysis.\n\n` +
        `Generated via URJALINK Energy Equity Index`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleAlertNGO = () => {
    const orgs = [
      "GRID Alternatives",
      "Solar United Neighbors",
      "Local Community Development Corporation",
    ];

    toast({
      title: "NGO Partner Recommendations",
      description: `Connecting you with: ${orgs.join(", ")}. These organizations provide free solar installations, community solar programs, and financing assistance.`,
    });
  };

  const isSolarDesert = equityData.user_address_score.total_score < 35;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
    >
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-blue-400" />
        Take Action
      </h3>

      <p className="text-sm text-white/70 mb-6 leading-relaxed">
        {isSolarDesert ? (
          <>
            Your area faces barriers to solar access. Use these tools to
            advocate for equitable energy programs and connect with assistance
            organizations.
          </>
        ) : (
          <>
            Help make solar energy accessible to all communities in{" "}
            {equityData.area_description}. Share insights and advocate for
            energy equity.
          </>
        )}
      </p>

      <div className="space-y-4">
        <ActionButton
          icon={<FileText className="h-5 w-5" />}
          label="Generate Equity Report (PDF)"
          description="Comprehensive analysis with policy recommendations"
          onClick={handleGenerateReport}
          primary
        />

        <ActionButton
          icon={<Send className="h-5 w-5" />}
          label="Contact City Council"
          description="Email template for local government advocacy"
          onClick={handleRecommendToCouncil}
        />

        <ActionButton
          icon={<Users className="h-5 w-5" />}
          label="Connect with NGO Partners"
          description="Organizations providing solar assistance programs"
          onClick={handleAlertNGO}
        />
      </div>

      {/* Solar Deserts Summary */}
      {equityData.solar_deserts_count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 p-4 rounded-2xl bg-orange-400/10 border border-orange-400/30"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <span className="font-semibold text-orange-400">
              {equityData.solar_deserts_count} Solar Deserts Identified
            </span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            These neighborhoods have high solar potential but face income,
            ownership, or program access barriers. Targeted interventions could
            unlock significant clean energy benefits for underserved
            communities.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}

const ActionButton = ({
  icon,
  label,
  description,
  onClick,
  primary,
}: ActionButtonProps) => {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      className={`w-full h-auto p-4 justify-start text-left transition-all duration-200 rounded-2xl border border-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-lg ${
        primary
          ? "bg-blue-500/20 hover:bg-blue-500/30 border-blue-400/30"
          : "bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start gap-4 w-full">
        <div
          className={`p-2 rounded-xl ${
            primary
              ? "bg-blue-400/20 text-blue-200"
              : "bg-white/10 text-white/80"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white mb-1">{label}</div>
          <div className="text-sm text-white/60 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </Button>
  );
};
