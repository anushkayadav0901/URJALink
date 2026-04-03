/**
 * Map an equity score (0-100) to a hex colour for visualisation.
 */
export function equityScoreToColor(score: number): string {
    if (score >= 65) return "#10B981"; // emerald-500  — High equity
    if (score >= 35) return "#F59E0B"; // amber-500    — Moderate
    return "#EF4444"; // red-500      — Solar desert
}

/**
 * Return an emoji icon representing the equity band.
 */
export function getEquityIcon(score: number): string {
    if (score >= 65) return "✅";
    if (score >= 35) return "⚠️";
    return "🚨";
}

/**
 * Human-readable equity message for the score.
 */
export function getEquityMessage(score: number): string {
    if (score >= 65)
        return "High Equity — Your community has strong solar access.";
    if (score >= 35)
        return "Moderate Equity — Some barriers exist for solar adoption.";
    return "Solar Desert — Significant systemic barriers to solar access.";
}

/**
 * Tailwind CSS class string for the equity band alert box.
 */
export function getEquityColorClass(score: number): string {
    if (score >= 65)
        return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
    if (score >= 35)
        return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    return "border-red-400/30 bg-red-400/10 text-red-300";
}

