interface LossWarningProps {
  lossAmount: number;
}

export const LossWarning = ({ lossAmount }: LossWarningProps) => {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/60">
        If you do not install solar, you may spend{" "}
        <span className="font-semibold text-white">
          ₹{lossAmount.toLocaleString()}
        </span>{" "}
        more over 10 years.
      </p>
    </div>
  );
};
