import type { OptimizationResult } from "../types";

function getWasteColorClass(percent: number): string {
  if (percent <= 10) return "text-green-500";
  if (percent <= 25) return "text-amber-500";
  return "text-red-500";
}

interface SummaryCardProps {
  results: OptimizationResult;
  unit: string;
}

export default function SummaryCard({ results, unit }: SummaryCardProps) {
  const totalStockLength = results.stockResults.reduce((sum, r) => sum + r.stockLength, 0);
  // True efficiency: actual cut material / total stock (excludes kerf + remnant)
  const cutSum = results.stockResults.reduce(
    (sum, sr) => sum + sr.cuts.reduce((s, c) => s + c.length, 0),
    0,
  );
  const efficiency = totalStockLength > 0 ? (cutSum / totalStockLength) * 100 : 0;

  return (
    <div className="island-shell rounded-2xl p-5 rise-in">
      <h2 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2 mb-4">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(79,184,178,0.18)] text-xs font-bold text-[var(--lagoon-deep)]">
          ✓
        </span>
        Optimization Summary
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Stock pieces used */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]">
            Stock Used
          </span>
          <span className="text-2xl font-bold text-[var(--sea-ink)] tabular-nums">
            {results.totalStockUsed}
          </span>
          <span className="text-xs text-[var(--sea-ink-soft)]">pieces</span>
        </div>

        {/* Total material */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]">
            Total Material
          </span>
          <span className="text-2xl font-bold text-[var(--sea-ink)] tabular-nums">
            {totalStockLength.toFixed(0)}
          </span>
          <span className="text-xs text-[var(--sea-ink-soft)]">{unit}</span>
        </div>

        {/* Used material (actual cuts only) */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]">
            Material Used
          </span>
          <span className="text-2xl font-bold text-[var(--lagoon-deep)] tabular-nums">
            {cutSum.toFixed(0)}
          </span>
          <span className="text-xs text-[var(--sea-ink-soft)]">{unit}</span>
        </div>

        {/* Remnant */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]">
            Total Remnant
          </span>
          <span
            className={`text-2xl font-bold tabular-nums ${getWasteColorClass(results.totalWastePercent)}`}
          >
            {results.totalWaste.toFixed(0)}
          </span>
          <span
            className={`text-xs font-semibold ${getWasteColorClass(results.totalWastePercent)}`}
          >
            {results.totalWastePercent.toFixed(1)}% remnant
          </span>
        </div>
      </div>

      {/* Efficiency bar */}
      <div className="mt-4 h-2 rounded-full bg-[var(--surface)] border border-[var(--line)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, efficiency)}%`,
            background: "linear-gradient(90deg, var(--lagoon), var(--palm))",
          }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-[var(--sea-ink-soft)]">
        <span>Efficiency (incl. kerf)</span>
        <span className="font-semibold tabular-nums">
          {efficiency.toFixed(1)}%
        </span>
      </div>

      {/* Unplaced cuts warning */}
      {results.unplacedCuts.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-red-500/50 bg-red-500/10 p-4 animate-pulse-subtle">
          <p className="text-sm font-bold text-red-500 mb-2 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
              !
            </span>
            {results.unplacedCuts.length} cut{results.unplacedCuts.length > 1 ? "s" : ""} could not
            be placed
          </p>
          <p className="text-xs text-[var(--sea-ink-soft)] mb-3">
            These cuts are too long for any available stock:
          </p>
          <div className="flex flex-wrap gap-2">
            {results.unplacedCuts.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-500"
              >
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {c.label && <span>{c.label}</span>}
                <span className="tabular-nums">{c.length}</span>
                <span className="text-red-400">({unit})</span>
                {c.quantity > 1 && <span className="text-red-400">×{c.quantity}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
