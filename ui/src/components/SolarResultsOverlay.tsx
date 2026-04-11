import { useEffect, useState } from "react";
import {
  X,
  Zap,
  DollarSign,
  Leaf,
  Sun,
  TrendingUp,
  Home,
  Battery,
  Calendar,
  Award,
  MapPin,
  Gift,
  Sparkles,
  Info,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EquityAnalysisResponse } from "@/lib/URJALINK-api";
import { useSummarizeMetricsApiV1SummaryPost } from "@/lib/api/hooks/useSummarizeMetricsApiV1SummaryPost";
import type { SummarizeMetricsApiV1SummaryPostMutationRequest } from "@/lib/api/models/SummarizeMetricsApiV1SummaryPost";
import { useAgentsInstallersApiV1AgentsInstallersPost } from "@/lib/api/hooks/useAgentsInstallersApiV1AgentsInstallersPost";
import { useAgentsIncentivesApiV1AgentsIncentivesPost } from "@/lib/api/hooks/useAgentsIncentivesApiV1AgentsIncentivesPost";
import { apiClientConfig } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { VoiceWidget } from "@/components/VoiceWidget";
import { EquityScoreCard } from "./EquityScoreCard";
import { EquityHeatmap } from "./EquityHeatmap";
import { EquityActionsPanel } from "./EquityActionsPanel";
import { BillComparisonUpload } from "./BillComparisonUpload";
import { FinancingOptions, type FinancingOption } from "./india/FinancingOptions";
import { InvestmentBreakdownModal } from "./india/InvestmentBreakdownModal";
import { PeopleLikeYou } from "./india/PeopleLikeYou";
import { SimplifiedFinancialCard } from "./india/SimplifiedFinancialCard";
import { ModePanel, type ViewMode } from "./modes/ModePanel";
import { DecisionMode } from "./modes/DecisionMode";
import { FutureMode } from "./modes/FutureMode";
import { InsightsModal } from "./modes/InsightsModal";
import { StoryModeToggle } from "./story/StoryModeToggle";
import { StoryContent } from "./story/StoryContent";
import { EnhancedFinancialCard } from "./enhanced/EnhancedFinancialCard";
import type { SolarStats } from "@/types/solar";

// Normalize markdown for proper rendering
// Keep it simple - only fix essential issues to avoid breaking valid markdown
const normalizeMarkdown = (markdown: string) => {
  if (!markdown) return "";

  const normalized = markdown
    // Convert literal \n strings to actual newlines (API may send escaped newlines)
    .replace(/\\n/g, "\n")
    // Normalize line endings
    .replace(/\r\n/g, "\n")

    // Fix table separators that are too long (normalize to reasonable length)
    .replace(/\|[-]{100,}\|/g, "|---|---|---|---|---|---|---|")

    // Clean up excessive blank lines (more than 2)
    .replace(/\n{3,}/g, "\n\n")

    // Trim
    .trim();

  // Fix malformed table separators (e.g., "-----||" -> "|--------|--------|...")
  // Process line by line to fix separators
  const lines = normalized.split("\n");
  const fixedLines = lines.map((line, index) => {
    // Check if this line is a malformed separator (dashes with no/incorrect pipes)
    if (/^[-]{3,}\|{0,2}$/.test(line)) {
      // Find the previous line (header row)
      const prevLine = index > 0 ? lines[index - 1] : "";
      if (prevLine && prevLine.includes("|")) {
        // Count columns in header row (split by | and filter empty cells)
        const cells = prevLine.split("|").filter((cell) => cell.trim() !== "");
        const columnCount = cells.length;
        if (columnCount > 0) {
          return "|" + Array(columnCount).fill("--------").join("|") + "|";
        }
      }
    }
    return line;
  });

  return fixedLines.join("\n");
};

interface SolarResultsOverlayProps {
  stats: SolarStats | null;
  address: string;
  onClose: () => void;
  isVisible: boolean;
  latitude?: number;
  longitude?: number;
}

export const SolarResultsOverlay = ({
  stats,
  address,
  onClose,
  isVisible,
  latitude,
  longitude,
}: SolarResultsOverlayProps) => {
  const [activeTab, setActiveTab] = useState<"analysis" | "actions" | "equity">(
    "analysis",
  );
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [installersContent, setInstallersContent] = useState<string>("");
  const [incentivesContent, setIncentivesContent] = useState<string>("");
  const { toast } = useToast();
  const [summaryRequestKey, setSummaryRequestKey] = useState(0);
  const [showVoiceWidget, setShowVoiceWidget] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("analysis");
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);

  // Kubb-generated mutation hooks
  const summaryMutation = useSummarizeMetricsApiV1SummaryPost({
    client: apiClientConfig,
  });
  const installersMutation = useAgentsInstallersApiV1AgentsInstallersPost({
    client: apiClientConfig,
  });
  const incentivesMutation = useAgentsIncentivesApiV1AgentsIncentivesPost({
    client: apiClientConfig,
  });

  // Derived state from mutations
  const isSummaryLoading = summaryMutation.isPending;
  const summaryError = summaryMutation.error
    ? summaryMutation.error instanceof Error
      ? summaryMutation.error.message
      : "Failed to generate narrative summary"
    : null;
  const summaryMarkdown = summaryMutation.data?.summary_markdown ?? null;
  const summaryModel = summaryMutation.data?.model_name ?? null;
  const summaryGeneratedAt = summaryMutation.data?.generated_at ?? null;
  const isLoadingInstallers = installersMutation.isPending;
  const isLoadingIncentives = incentivesMutation.isPending;

  // Markdown is already formatted from the API, just normalize for rendering
  const normalizedInstallersMarkdown = normalizeMarkdown(installersContent);
  const normalizedIncentivesMarkdown = normalizeMarkdown(incentivesContent);

  useEffect(() => {
    if (installersContent) {
      console.group("[URJALINK] Installers Markdown");
      console.log("Content:", installersContent);
      console.log("Character count:", installersContent.length);
      console.log(
        "Newline count:",
        (installersContent.match(/\n/g) || []).length,
      );
      console.groupEnd();
    }
  }, [installersContent]);

  useEffect(() => {
    if (incentivesContent) {
      console.group("[URJALINK] Incentives Markdown");
      console.log("Content:", incentivesContent);
      console.log("Character count:", incentivesContent.length);
      console.log(
        "Newline count:",
        (incentivesContent.match(/\n/g) || []).length,
      );
      console.groupEnd();
    }
  }, [incentivesContent]);

  const extractAddressComponents = async (lat: number, lng: number) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });

      if (result.results[0]) {
        const components = result.results[0].address_components;
        const state =
          components.find((c) =>
            c.types.includes("administrative_area_level_1"),
          )?.short_name || "CA";
        const zipCode =
          components.find((c) => c.types.includes("postal_code"))?.short_name ||
          "00000";
        return { state, zipCode };
      }
    } catch (error) {
      console.error("❌ Geocoding error:", error);
    }
    return { state: "CA", zipCode: "00000" };
  };

  const buildFinancialOutlook = (solarStats: SolarStats) => {
    const totalSavings = solarStats.annualSavings * 25;
    return {
      system_cost_net: Math.round(solarStats.systemCost),
      total_net_savings_25_years: Math.round(totalSavings),
      net_profit_25_years: Math.round(totalSavings - solarStats.systemCost),
      payback_period_years: Number(solarStats.paybackYears.toFixed(1)),
      roi_25_years: Number(solarStats.roi.toFixed(1)),
      first_year_savings_gross: Math.round(solarStats.annualSavings),
      first_year_savings_net: Math.round(solarStats.annualSavings * 0.92),
    };
  };

  const buildSolarPotentialPayload = (solarStats: SolarStats) => {
    const solarPotential = solarStats.fullResponse?.solar_potential;
    if (solarPotential) {
      return {
        ...solarPotential,
        system_size_kw:
          solarPotential.system_size_kw ?? solarStats.systemSizeKw,
        annual_generation_kwh:
          solarPotential.annual_generation_kwh ?? solarStats.yearlyEnergyKwh,
        daily_generation_kwh:
          solarPotential.daily_generation_kwh ?? solarStats.dailyEnergyKwh,
        capacity_factor:
          solarPotential.capacity_factor ??
          Number(
            (
              solarStats.yearlyEnergyKwh / (solarStats.systemSizeKw * 8760 || 1)
            ).toFixed(2),
          ),
        energy_offset_percent:
          solarPotential.energy_offset_percent ??
          Math.min(
            100,
            Math.round(
              (solarStats.yearlyEnergyKwh /
                (solarStats.systemSizeKw * 1500 || 1)) *
                100,
            ),
          ),
        co2_offset_tons_yearly:
          solarPotential.co2_offset_tons_yearly ??
          Number((solarStats.carbonOffset / 1000).toFixed(2)),
        co2_offset_tons_25year:
          solarPotential.co2_offset_tons_25year ??
          Number(((solarStats.carbonOffset / 1000) * 25).toFixed(2)),
        equivalent_trees_planted:
          solarPotential.equivalent_trees_planted ?? solarStats.treesEquivalent,
      };
    }

    const yearlyHours = solarStats.systemSizeKw * 8760 || 1;
    const capacityFactor = Number(
      (solarStats.yearlyEnergyKwh / yearlyHours).toFixed(2),
    );
    const co2TonsYearly = Number((solarStats.carbonOffset / 1000).toFixed(2));

    return {
      system_size_kw: solarStats.systemSizeKw,
      annual_generation_kwh: solarStats.yearlyEnergyKwh,
      daily_generation_kwh: solarStats.dailyEnergyKwh,
      capacity_factor: capacityFactor,
      energy_offset_percent: Math.min(
        100,
        Math.round(
          (solarStats.yearlyEnergyKwh / (solarStats.systemSizeKw * 1500 || 1)) *
            100,
        ),
      ),
      co2_offset_tons_yearly: co2TonsYearly,
      co2_offset_tons_25year: Number((co2TonsYearly * 25).toFixed(2)),
      equivalent_trees_planted: solarStats.treesEquivalent,
    };
  };

  const triggerSummaryRefresh = () => setSummaryRequestKey((prev) => prev + 1);

  // Show widget when overlay is visible
  useEffect(() => {
    if (isVisible) {
      setShowVoiceWidget(true);
    } else {
      setShowVoiceWidget(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!stats?.analysisId) {
      return;
    }

    const payload = {
      analysis_id: stats.analysisId,
      location: stats.location,
      solar_potential: buildSolarPotentialPayload(stats),
      financial_outlook: buildFinancialOutlook(stats),
    };

    summaryMutation.mutate({
      data: payload as SummarizeMetricsApiV1SummaryPostMutationRequest,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats?.analysisId, summaryRequestKey]);

  const handleStreamBoth = async () => {
    const fallbackLat = latitude ?? stats?.location?.latitude;
    const fallbackLng = longitude ?? stats?.location?.longitude;
    const fallbackAddress =
      address || stats?.location?.address || "Selected location";

    if (!stats?.analysisId || !fallbackLat || !fallbackLng) {
      toast({
        title: "Missing data",
        description:
          "Unable to fetch results without complete analysis details",
        variant: "destructive",
      });
      return;
    }

    setActiveTab("actions");
    setInstallersContent("");
    setIncentivesContent("");

    try {
      const { state, zipCode } = await extractAddressComponents(
        fallbackLat,
        fallbackLng,
      );

      const requestData = {
        analysis_id: stats.analysisId,
        latitude: fallbackLat,
        longitude: fallbackLng,
        address: fallbackAddress,
        system_size_kw: stats.systemSizeKw,
        annual_generation_kwh: stats.yearlyEnergyKwh,
        state,
        zip_code: zipCode,
      };

      // Fetch both in parallel using mutation hooks
      const [installersResponse, incentivesResponse] = await Promise.all([
        installersMutation.mutateAsync({ data: requestData }),
        incentivesMutation.mutateAsync({ data: requestData }),
      ]);

      setInstallersContent(installersResponse.installers_markdown);
      setIncentivesContent(incentivesResponse.incentives_markdown);
    } catch (error) {
      console.error("Error fetching installers/incentives:", error);
      toast({
        title: "Error loading data",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load installers and incentives",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  // USD to INR conversion (1 USD = ₹83)
  const usdToINR = (usd: number) => Math.round(usd * 83);

  // Handle insights mode
  const handleModeChange = (mode: ViewMode) => {
    if (mode === "insights") {
      setShowInsightsModal(true);
    } else {
      setViewMode(mode);
    }
  };

  if (!stats) return null;

  const solarScore = Math.min(Math.round(stats.roi / 1.5 + 20), 100);
  const solarInsightCopy =
    solarScore >= 85
      ? "Exceptional potential"
      : solarScore >= 70
        ? "Great opportunity"
        : "Solid opportunity";
  const tabBaseClasses =
    "flex-1 rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";
  const highlightCards = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Usable Roof",
      value: `${formatNumber(Math.round(stats.usableAreaSqft))} sqft`,
      helper: "Plenty of premium roof space for maximum yield.",
    },
    {
      icon: <Sun className="h-5 w-5" />,
      label: "Daily Generation",
      value: `${formatNumber(Math.round(stats.dailyEnergyKwh))} kWh`,
      helper: "Comfortably covers typical household demand.",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Payback Timeline",
      value: `${stats.paybackYears} yrs`,
      helper: "After this point the system prints savings.",
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Main Overlay Card with Mode Panel */}
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto p-4 sm:p-8">
            <div className="flex h-full max-h-[90vh] w-full max-w-[1400px] gap-4">
              {/* Left: Mode Panel */}
              <ModePanel activeMode={viewMode} onModeChange={handleModeChange} />

              {/* Center: Main Content */}
              <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
              }}
              className={`relative flex h-full flex-1 flex-col overflow-y-auto rounded-[32px] border border-white/10 bg-white/5 shadow-[0_25px_80px_rgba(15,23,42,0.45)] backdrop-blur-3xl dark:bg-slate-950/70 ${showScoreBreakdown ? "blur-sm" : ""}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-cyan-400/30 opacity-70 blur-3xl" />
              <div className="absolute inset-0 bg-white/5 dark:bg-slate-950/60" />
              <div className="relative flex h-full min-h-0 flex-col">
                <button
                  onClick={() => {
                    setShowVoiceWidget(false);
                    onClose();
                  }}
                  className="absolute top-5 right-5 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white transition hover:bg-white/30"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Header */}
                <div className="relative m-4 overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-br from-indigo-600/80 via-blue-600/70 to-sky-500/60 p-6 text-white shadow-[0_20px_60px_rgba(15,23,42,0.45)] sm:p-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-transparent opacity-70 blur-3xl" />
                  <div className="relative flex flex-col gap-6 pr-6 md:pr-12">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.5em] text-white/70">
                          Solar Analysis
                        </p>
                        <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                          Solar Analysis Results
                        </h2>
                        <p className="text-sm text-white/80">{address}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.4em] text-white/80">
                          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 backdrop-blur-xl">
                            {stats.analysisType === "user-defined"
                              ? "User-Defined Layout"
                              : "AI-Detected Layout"}
                          </span>
                          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 backdrop-blur-xl">
                            {stats.polygonPoints} Roof pts
                          </span>
                        </div>
                      </div>
                      <div className="rounded-3xl border border-white/30 bg-white/10 px-6 py-5 text-right shadow-inner backdrop-blur-2xl sm:min-w-[220px]">
                        <div className="flex items-center justify-end gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                            Solar Score
                          </p>
                          <button
                            onClick={() =>
                              setShowScoreBreakdown(!showScoreBreakdown)
                            }
                            className="inline-flex items-center justify-center rounded-full bg-white/20 p-1 transition hover:bg-white/30"
                            title="View score breakdown"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-5xl font-bold leading-none">
                            {solarScore}
                          </span>
                          <span className="text-sm font-semibold text-white/70">
                            /100
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2 text-sm text-white">
                          <Sparkles className="h-4 w-4" />
                          <span>{solarInsightCopy}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/25 bg-white/10 p-4 shadow-inner backdrop-blur-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                          Confidence
                        </p>
                        <p className="text-sm text-white/80">
                          {stats.confidence}% certainty based on AI scan
                        </p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{
                              width: `${stats.confidence}%`,
                            }}
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/25 bg-white/10 p-4 shadow-inner backdrop-blur-2xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                          System Snapshot
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-white">
                          <div>
                            <p className="text-white/70">System Size</p>
                            <p className="text-xl font-semibold">
                              {stats.systemSizeKw.toFixed(1)} kW
                            </p>
                          </div>
                          <div>
                            <p className="text-white/70">Daily Output</p>
                            <p className="text-xl font-semibold">
                              {formatNumber(Math.round(stats.dailyEnergyKwh))}{" "}
                              kWh
                            </p>
                          </div>
                          <div>
                            <p className="text-white/70">Usable Roof</p>
                            <p className="text-xl font-semibold">
                              {formatNumber(Math.round(stats.usableAreaSqft))}{" "}
                              sqft
                            </p>
                          </div>
                          <div>
                            <p className="text-white/70">Max Panels</p>
                            <p className="text-xl font-semibold">
                              {formatNumber(stats.maxPanels)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 pt-2 pb-4">
                  <div className="flex justify-center">
                    <div className="inline-flex w-full max-w-2xl items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 shadow-inner backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={() => setActiveTab("analysis")}
                        aria-pressed={activeTab === "analysis"}
                        className={`${tabBaseClasses} ${
                          activeTab === "analysis"
                            ? "bg-white text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.2)]"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Analysis
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("equity")}
                        aria-pressed={activeTab === "equity"}
                        className={`${tabBaseClasses} ${
                          activeTab === "equity"
                            ? "bg-white text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.2)]"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Globe className="h-4 w-4" />
                          Energy Equity
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            installersContent === "" &&
                            incentivesContent === ""
                          ) {
                            handleStreamBoth();
                          } else {
                            setActiveTab("actions");
                          }
                        }}
                        aria-pressed={activeTab === "actions"}
                        className={`${tabBaseClasses} ${
                          activeTab === "actions"
                            ? "bg-white text-slate-900 shadow-[0_12px_35px_rgba(15,23,42,0.2)]"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Next Steps
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 px-6 pb-10">
                  {/* Story Mode Toggle - Top Left */}
                  <div className="mb-6">
                    <StoryModeToggle 
                      isStoryMode={isStoryMode} 
                      onToggle={setIsStoryMode} 
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "analysis" ? (
                      <motion.div
                        key="analysis"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-6 space-y-6"
                      >
                        {isStoryMode ? (
                          /* Story View */
                          <StoryContent
                            systemSizeKw={stats.systemSizeKw}
                            yearlyEnergyKwh={stats.yearlyEnergyKwh}
                            annualSavingsINR={usdToINR(stats.annualSavings)}
                            paybackYears={stats.paybackYears}
                            systemCostINR={usdToINR(stats.systemCost)}
                            carbonOffsetKg={stats.carbonOffset}
                            sunshineHours={stats.sunshineHours}
                            panelCount={stats.maxPanels}
                            solarScore={stats.solarScore ?? solarScore}
                            roofAreaSqft={stats.usableAreaSqft}
                            totalProfitINR={usdToINR(
                              stats.fullResponse?.financial_outlook?.net_profit_25_years ?? 0
                            )}
                          />
                        ) : (
                          /* Data View */
                          <>
                            {/* Narrative Summary */}
                            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/60">
                                    Gemini Narrative
                                  </p>
                                  <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold">
                                    <Sparkles className="h-5 w-5 text-amber-200" />
                                    Personalized summary
                                  </h3>
                                </div>
                                <div className="text-xs text-white/60">
                                  {summaryModel
                                    ? `Model • ${summaryModel}`
                                    : "Model warming up"}
                                  {summaryGeneratedAt && (
                                    <>
                                      {" "}
                                      ·{" "}
                                      {new Date(
                                        summaryGeneratedAt,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="prose prose-sm prose-invert mt-4 min-h-[140px] space-y-3 rounded-2xl border border-white/5 bg-black/20 p-4 prose-headings:text-white prose-a:text-white break-words">
                                {isSummaryLoading ? (
                                  <div className="space-y-3 text-white/60">
                                    <div className="h-3 w-5/6 rounded-full bg-white/10 animate-pulse" />
                                    <div className="h-3 w-full rounded-full bg-white/10 animate-pulse" />
                                    <div className="h-3 w-4/6 rounded-full bg-white/10 animate-pulse" />
                                  </div>
                                ) : summaryMarkdown ? (
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {summaryMarkdown}
                                  </ReactMarkdown>
                                ) : summaryError ? (
                                  <div className="flex flex-col gap-3 text-white/70">
                                    <p>{summaryError}</p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={triggerSummaryRefresh}
                                      className="self-start rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                                    >
                                      Try again
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-white/70">
                                    Summary not available yet. Hang tight for Gemini
                                    to respond.
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Quick Stats Grid */}
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                              <StatCard
                                icon={<Battery className="w-5 h-5" />}
                                label="Solar Panels"
                                value={formatNumber(stats.maxPanels)}
                                color="blue"
                              />
                              <StatCard
                                icon={<Zap className="w-5 h-5" />}
                                label="System Size"
                                value={`${stats.systemSizeKw.toFixed(1)} kW`}
                                color="purple"
                              />
                              <StatCard
                                icon={<Sun className="w-5 h-5" />}
                                label="Annual Energy"
                                value={`${formatNumber(stats.yearlyEnergyKwh)} kWh`}
                                color="orange"
                              />
                              <StatCard
                                icon={<Award className="w-5 h-5" />}
                                label="Solar Score"
                                value={`${solarScore}/100`}
                                color="green"
                              />
                            </div>

                            {/* Financial & Environmental */}
                            <div className="grid gap-6 lg:grid-cols-2">
                              {/* Enhanced Financial Card with All Features */}
                              <EnhancedFinancialCard
                                initialPanels={stats.maxPanels}
                                systemSizeKw={stats.systemSizeKw}
                                yearlyEnergyKwh={stats.yearlyEnergyKwh}
                                systemCostINR={usdToINR(stats.systemCost)}
                                annualSavingsINR={usdToINR(stats.annualSavings)}
                                paybackYears={stats.paybackYears}
                              />

                              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
                                <div className="flex items-center gap-2">
                                  <Leaf className="h-6 w-6 text-emerald-300" />
                                  <h3 className="text-xl font-semibold">
                                    Environmental Impact
                                  </h3>
                                </div>
                                <p className="text-sm text-white/70">
                                  Meaningful offsets for your community footprint
                                </p>
                                <div className="mt-6 space-y-5">
                                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="rounded-2xl bg-emerald-500/15 p-4">
                                      <Leaf className="h-8 w-8 text-emerald-300" />
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                                        CO₂ offset yearly
                                      </p>
                                      <p className="text-3xl font-bold">
                                        {formatNumber(
                                          Math.round(stats.carbonOffset / 1000),
                                        )}{" "}
                                        <span className="text-lg">tons</span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="rounded-2xl bg-emerald-500/15 p-4 text-3xl">
                                      🌳
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                                        Trees Equivalent
                                      </p>
                                      <p className="text-3xl font-bold">
                                        {formatNumber(stats.treesEquivalent)}{" "}
                                        <span className="text-lg">trees/year</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                                      Carbon Offset
                                    </p>
                                    <p className="text-xl font-semibold">
                                      {formatNumber(stats.carbonOffset)} kg lifetime
                                    </p>
                                  </div>
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                                      Trees Planting Power
                                    </p>
                                    <p className="text-xl font-semibold">
                                      {formatNumber(stats.treesEquivalent * 10)}{" "}
                                      saplings
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Opportunity Highlights */}
                            <div className="grid gap-4 md:grid-cols-3">
                              {highlightCards.map((card) => (
                                <div
                                  key={card.label}
                                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_15px_40px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                                      {card.icon}
                                    </div>
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                                        {card.label}
                                      </p>
                                      <p className="text-xl font-semibold">
                                        {card.value}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="mt-3 text-sm text-white/70">
                                    {card.helper}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* CTA */}
                            <Button
                              onClick={handleStreamBoth}
                              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-base font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] backdrop-blur-2xl transition hover:-translate-y-0.5"
                            >
                              <Zap className="h-4 w-4" />
                              <span>Explore installers & incentives</span>
                            </Button>
                          </>
                        )}
                      </motion.div>
                    ) : activeTab === "equity" ? (
                      <motion.div
                        key="equity"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        {/* Header */}
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                            <Globe className="h-6 w-6 text-blue-400" />
                            Energy Equity & Access Index
                          </h2>
                          <p className="text-sm text-white/70 max-w-2xl mx-auto leading-relaxed">
                            Analyzing disparities in solar access across income,
                            ownership, and energy burden. This score helps
                            identify communities that need targeted support to
                            access clean energy.
                          </p>
                        </div>

                        {stats?.fullResponse?.equity_analysis ? (
                          <>
                            {/* User's Equity Score */}
                            <EquityScoreCard
                              score={
                                stats.fullResponse.equity_analysis
                                  .user_address_score
                              }
                            />

                            {/* Neighborhood Heatmap */}
                            <div className="space-y-4">
                              <div>
                                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                                  <MapPin className="h-5 w-5 text-green-400" />
                                  Solar Equity in{" "}
                                  {
                                    stats.fullResponse.equity_analysis
                                      .area_description
                                  }
                                </h3>
                                <p className="text-sm text-white/70 mb-4">
                                  Click on any area to see detailed equity
                                  metrics. Red areas ("Solar Deserts") have high
                                  solar potential but face systemic barriers.
                                </p>
                              </div>
                              <EquityHeatmap
                                dataPoints={
                                  stats.fullResponse.equity_analysis
                                    .neighborhood_data
                                }
                                center={{
                                  lat:
                                    latitude ||
                                    stats.fullResponse.location.latitude,
                                  lng:
                                    longitude ||
                                    stats.fullResponse.location.longitude,
                                }}
                                onBlockGroupClick={(blockGroup) => {
                                  console.log(
                                    "Selected block group:",
                                    blockGroup,
                                  );
                                }}
                              />
                            </div>

                            {/* Action Panel */}
                            <EquityActionsPanel
                              equityData={stats.fullResponse.equity_analysis}
                              userAddress={address}
                            />

                            {/* Educational Footer */}
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-400" />
                                Understanding the Equity Score
                              </h4>
                              <p className="text-sm text-white/70 leading-relaxed">
                                The URJALINK Equity Score (0-100) measures how
                                accessible solar energy is for a community. It
                                considers income levels (can people afford solar
                                loans?), ownership rates (do residents control
                                their roofs?), energy burden (how much of income
                                goes to utilities?), and existing solar adoption
                                (are there proven programs?). A low score
                                doesn't mean residents don't deserve solar—it
                                means they face systemic barriers that policy
                                can address.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-12">
                            <div className="rounded-3xl border border-orange-400/30 bg-orange-400/10 p-8 text-orange-400">
                              <Globe className="h-12 w-12 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">
                                Equity Analysis Unavailable
                              </h3>
                              <p className="text-sm leading-relaxed">
                                Equity analysis is currently available for
                                Princeton, NJ area only. We're working to expand
                                coverage to more regions.
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col gap-6"
                      >
                        {/* Installers Column */}
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-blue-500/20 p-3">
                              <MapPin className="h-6 w-6 text-blue-200" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">
                                Local Solar Installers
                              </h3>
                              <p className="text-sm text-white/70">
                                Hand-picked teams with premium workmanship
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-white/70">
                            We surface certified installers, their specialties,
                            and contact info so you can start quoting
                            immediately.
                          </p>
                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-2xl min-h-[360px]">
                            <div className="prose prose-sm prose-invert max-w-none prose-headings:text-white prose-a:text-white prose-p:text-white prose-li:text-white prose-strong:text-white break-words">
                              {installersContent ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {normalizedInstallersMarkdown}
                                </ReactMarkdown>
                              ) : isLoadingInstallers ? (
                                <p className="flex items-center gap-2 text-white/70">
                                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                                  Loading installer information...
                                </p>
                              ) : (
                                <p className="text-white/60">
                                  Tap "Next Steps" to load installer insights.
                                </p>
                              )}
                            </div>
                            {isLoadingInstallers && (
                              <motion.span
                                animate={{
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                }}
                                className="mt-4 inline-flex items-center gap-2 text-sm text-blue-200"
                              >
                                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-300" />
                                Loading installers...
                              </motion.span>
                            )}
                          </div>
                        </div>

                        {/* Incentives Column */}
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_25px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-purple-500/20 p-3">
                              <Gift className="h-6 w-6 text-purple-200" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">
                                Available Incentives
                              </h3>
                              <p className="text-sm text-white/70">
                                Federal, state, and utility programs curated for
                                you
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm text-white/70">
                            Unlock stacked rebates, ITC credits, and niche
                            utility perks tailored to this property’s ZIP code.
                          </p>
                          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-2xl min-h-[360px]">
                            <div className="prose prose-sm prose-invert max-w-none prose-headings:text-white prose-a:text-white prose-p:text-white prose-li:text-white prose-strong:text-white break-words">
                              {incentivesContent ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {normalizedIncentivesMarkdown}
                                </ReactMarkdown>
                              ) : isLoadingIncentives ? (
                                <p className="flex items-center gap-2 text-white/70">
                                  <span className="h-2 w-2 animate-pulse rounded-full bg-purple-300" />
                                  Loading incentive information...
                                </p>
                              ) : (
                                <p className="text-white/60">
                                  Tap "Next Steps" to load incentive
                                  information.
                                </p>
                              )}
                            </div>
                            {isLoadingIncentives && (
                              <motion.span
                                animate={{
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                }}
                                className="mt-4 inline-flex items-center gap-2 text-sm text-purple-200"
                              >
                                <span className="h-2 w-2 animate-pulse rounded-full bg-purple-300" />
                                Loading incentives...
                              </motion.span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
            </div>
          </div>

          {/* Score Breakdown Modal - Independent positioning */}
          <AnimatePresence>
            {showScoreBreakdown && (
              <>
                {/* Backdrop for score breakdown modal */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowScoreBreakdown(false)}
                  className="fixed inset-0 bg-black/70 z-[100]"
                />

                {/* Score Breakdown Modal - Completely independent */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{
                    type: "spring",
                    damping: 25,
                    stiffness: 300,
                  }}
                  className="fixed inset-0 flex items-center justify-center p-4 z-[101]"
                >
                  <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-6 shadow-[0_40px_100px_rgba(251,191,36,0.6)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-900/20 flex items-center justify-center">
                          <Sun className="h-5 w-5 text-slate-900" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">
                          Score Breakdown
                        </h4>
                      </div>
                      <button
                        onClick={() => setShowScoreBreakdown(false)}
                        className="h-8 w-8 rounded-full bg-slate-900/20 hover:bg-slate-900/30 flex items-center justify-center text-slate-900 transition"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {stats.solarScoreBreakdown ? (
                      <>
                        <div className="space-y-2.5 mb-4">
                          {Object.entries(
                            stats.solarScoreBreakdown.components,
                          ).map(([key, component]) => (
                            <div
                              key={key}
                              className="rounded-xl bg-slate-900/20 p-3 backdrop-blur-sm border border-slate-900/10"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-slate-900 capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <span className="text-sm font-bold text-slate-900">
                                  {component.weighted_score.toFixed(1)} pts
                                </span>
                              </div>
                              <p className="text-xs text-slate-800 mb-2">
                                {component.details}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-800">
                                <span>Score: {component.score.toFixed(1)}</span>
                                <span>×</span>
                                <span>
                                  Weight: {component.weight.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t-2 border-slate-900/20">
                          <p className="text-xs font-semibold text-slate-900 mb-2">
                            Calculation Formula:
                          </p>
                          <p className="text-xs text-slate-800 font-mono bg-slate-900/10 rounded-lg p-2.5 border border-slate-900/10">
                            {stats.solarScoreBreakdown.formula}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-base font-semibold text-slate-900 mb-2">
                          Breakdown data not available
                        </p>
                        <p className="text-sm text-slate-800">
                          The backend server may not be running or this analysis
                          was done before the breakdown feature was added.
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Insights Modal */}
          <InsightsModal
            isOpen={showInsightsModal}
            onClose={() => setShowInsightsModal(false)}
            systemSizeKw={stats.systemSizeKw}
            yearlyEnergyKwh={stats.yearlyEnergyKwh}
            annualSavingsINR={usdToINR(stats.annualSavings)}
            carbonOffsetKg={stats.carbonOffset}
          />

          {/* ElevenLabs Voice Widget - Fixed to bottom right */}
          {showVoiceWidget && stats && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <VoiceWidget
                address={address}
                solarData={{
                  systemSizeKw: stats.systemSizeKw,
                  maxPanels: stats.maxPanels,
                  yearlyEnergyKwh: stats.yearlyEnergyKwh,
                  dailyEnergyKwh: stats.dailyEnergyKwh,
                  usableAreaSqft: stats.usableAreaSqft,
                  roofAreaSqft: stats.roofAreaSqft,
                  systemCost: stats.systemCost,
                  annualSavings: stats.annualSavings,
                  paybackYears: stats.paybackYears,
                  roi: stats.roi,
                  carbonOffset: stats.carbonOffset,
                  treesEquivalent: stats.treesEquivalent,
                  solarScore: solarScore,
                  confidence: stats.confidence,
                  analysisType: stats.analysisType,
                  orientation: stats.orientation,
                  fullResponse: stats.fullResponse,
                }}
                incentive={incentivesContent}
                installerData={installersContent}
              />
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

// Reusable StatCard Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "purple" | "green" | "orange";
}

const StatCard = ({ icon, label, value, color }: StatCardProps) => {
  const colorClasses = {
    blue: {
      gradient: "from-sky-500/40 via-sky-400/10 to-transparent",
      icon: "bg-sky-500/20 text-sky-50",
    },
    purple: {
      gradient: "from-purple-500/40 via-fuchsia-500/10 to-transparent",
      icon: "bg-purple-500/20 text-purple-50",
    },
    green: {
      gradient: "from-emerald-500/40 via-emerald-400/10 to-transparent",
      icon: "bg-emerald-500/20 text-emerald-50",
    },
    orange: {
      gradient: "from-amber-500/40 via-amber-400/10 to-transparent",
      icon: "bg-amber-500/20 text-amber-50",
    },
  } as const;
  const styles = colorClasses[color];

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur-2xl transition-all hover:-translate-y-1"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-80`}
      />
      <div className="relative flex flex-col gap-3">
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${styles.icon}`}
        >
          {icon}
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
          {label}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
    </motion.div>
  );
};
