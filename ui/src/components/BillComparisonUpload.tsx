import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  TrendingDown,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBillComparisonApiV1BillComparisonPost } from "@/lib/api/hooks/useBillComparisonApiV1BillComparisonPost";
import { apiClientConfig } from "@/lib/api-config";
import type { BillComparisonResponse } from "@/lib/api/models/BillComparisonResponse";
import { useToast } from "@/hooks/use-toast";

interface BillComparisonUploadProps {
  firstYearSavingsNet: number;
  paybackPeriodYears: number;
  monthlySavings: number;
  currency?: { code: string; locale: string };
}

export function BillComparisonUpload({
  firstYearSavingsNet,
  paybackPeriodYears,
  monthlySavings,
  currency = { code: "USD", locale: "en-US" },
}: BillComparisonUploadProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
      maximumFractionDigits: 2,
    }).format(amount);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Kubb-generated mutation hook
  const billMutation = useBillComparisonApiV1BillComparisonPost({
    client: apiClientConfig,
  });

  // Derived state from mutation
  const isUploading = billMutation.isPending;
  const comparisonResult = billMutation.data as
    | BillComparisonResponse
    | undefined;
  const error = billMutation.error
    ? billMutation.error instanceof Error
      ? billMutation.error.message
      : "Failed to analyze bill"
    : null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are supported",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a PDF file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    billMutation.reset();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    billMutation.mutate(
      {
        data: {
          file: selectedFile,
          first_year_savings_net: firstYearSavingsNet,
          payback_period_years: paybackPeriodYears,
          monthly_savings: monthlySavings,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Bill analyzed successfully",
            description: "Your before and after savings comparison is ready",
          });
        },
        onError: (err) => {
          toast({
            title: "Upload failed",
            description:
              err instanceof Error ? err.message : "Failed to analyze bill",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleReset = () => {
    setSelectedFile(null);
    billMutation.reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-emerald-300" />
        <h4 className="text-lg font-semibold">Compare Your Bill</h4>
      </div>
      <p className="text-sm text-white/70 mb-4">
        Upload your electricity bill (PDF) to see detailed before and after
        savings
      </p>

      {!comparisonResult ? (
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
              selectedFile
                ? "border-emerald-400/50 bg-emerald-400/5"
                : "border-white/20 bg-white/5 hover:border-white/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <Upload
              className={`h-10 w-10 mb-2 ${selectedFile ? "text-emerald-300" : "text-white/40"}`}
            />
            {selectedFile ? (
              <div className="text-center">
                <p className="text-sm font-medium text-emerald-300">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your PDF here or click to browse
                </p>
                <p className="text-xs text-white/60 mt-1">
                  Max file size: 10MB
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
              <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Compare
                </>
              )}
            </Button>
            {selectedFile && !isUploading && (
              <Button
                onClick={handleReset}
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300">
              Bill analyzed successfully!
            </p>
          </div>

          {/* Comparison Results */}
          <div className="space-y-4">
            {/* Before & After Comparison */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Current Bill */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-white/60" />
                  <h5 className="text-sm font-medium text-white/80 uppercase tracking-wider">
                    Current Bill
                  </h5>
                </div>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(comparisonResult.current_monthly_bill)}
                </p>
                <p className="text-xs text-white/60 mt-1">per month</p>
              </div>

              {/* New Bill (After Solar) */}
              <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-5 w-5 text-emerald-400" />
                  <h5 className="text-sm font-medium text-emerald-300 uppercase tracking-wider">
                    After Solar
                  </h5>
                </div>
                <p className="text-3xl font-bold text-emerald-300">
                  {formatCurrency(Math.abs(comparisonResult.new_monthly_bill))}
                  {comparisonResult.new_monthly_bill < 0 && (
                    <span className="text-lg"> credit</span>
                  )}
                </p>
                <p className="text-xs text-white/60 mt-1">per month</p>
              </div>
            </div>

            {/* Savings Highlight */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-400/20 to-transparent p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-emerald-300" />
                <h5 className="text-sm font-medium text-white/80 uppercase tracking-wider">
                  Annual Savings
                </h5>
              </div>
              <p className="text-4xl font-bold text-emerald-300">
                {formatCurrency(
                  (comparisonResult.current_monthly_bill -
                    comparisonResult.new_monthly_bill) *
                  12
                )}
              </p>
              <p className="text-sm text-white/70 mt-2">
                Monthly difference:{" "}
                {formatCurrency(
                  comparisonResult.current_monthly_bill -
                  comparisonResult.new_monthly_bill
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={handleReset}
            variant="ghost"
            className="w-full text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
          >
            Upload Another Bill
          </Button>
        </div>
      )}
    </div>
  );
}
