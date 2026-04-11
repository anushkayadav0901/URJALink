export const RecommendationCard = () => {
  return (
    <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-white">
      <p className="text-xs uppercase tracking-[0.4em] text-green-300/80 mb-2">
        Recommendation
      </p>
      <p className="text-2xl font-bold text-green-300 mb-2">Install Solar</p>
      <p className="text-sm text-white/70">
        High solar potential with fast payback. This location is ideal for solar
        installation.
      </p>
    </div>
  );
};
