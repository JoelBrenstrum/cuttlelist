import type { OptimizationResult } from "../types";

function getWasteColorClass(percent: number): string {
  if (percent <= 10) return "text-green-500";
  if (percent <= 25) return "text-amber-500";
  return "text-red-500";
}

interface ComparisonReportProps {
  primary: OptimizationResult;
  alternative: OptimizationResult;
  unit: string;
}

interface ComparisonRow {
  label: string;
  primaryValue: string;
  altValue: string;
  winner: "primary" | "alt" | "tie";
  unit?: string;
  separator?: boolean;
}

function compareNum(
  a: number,
  b: number,
  lowerIsBetter = true,
): "primary" | "alt" | "tie" {
  if (a === b) return "tie";
  if (lowerIsBetter) return a < b ? "primary" : "alt";
  return a > b ? "primary" : "alt";
}

interface WasteAnalysis {
  offcutCount: number;
  reusableCount: number;
  scrapCount: number;
  totalReusableLength: number;
  avgOffcutLength: number;
  maxOffcutLength: number;
  /** Concentration score: sum(offcut²) / sum(offcut). Favors fewer, larger offcuts. */
  wasteQualityScore: number;
}

function analyzeWaste(results: OptimizationResult): WasteAnalysis {
  const offcuts = results.stockResults
    .filter((sr) => sr.wasteLength > 0)
    .map((sr) => sr.wasteLength);

  if (offcuts.length === 0) {
    return {
      offcutCount: 0,
      reusableCount: 0,
      scrapCount: 0,
      totalReusableLength: 0,
      avgOffcutLength: 0,
      maxOffcutLength: 0,
      wasteQualityScore: Infinity,
    };
  }

  const minStockLength = Math.min(...results.stockResults.map((sr) => sr.stockLength));
  const threshold = minStockLength * 0.1;

  const reusable = offcuts.filter((l) => l >= threshold);
  const scrap = offcuts.filter((l) => l < threshold);
  const totalReusableLength = reusable.reduce((s, l) => s + l, 0);
  const totalWaste = offcuts.reduce((s, l) => s + l, 0);
  const avgOffcutLength = totalWaste / offcuts.length;

  // Concentration score: sum(offcut²) / sum(offcut)
  // Favors fewer, larger offcuts. e.g.:
  //   1×1000mm → 1000²/1000 = 1000
  //   10×100mm → 10×100²/1000 = 100
  // The single large piece scores 10× higher.
  const sumOfSquares = offcuts.reduce((s, l) => s + l * l, 0);
  const wasteQualityScore = totalWaste > 0 ? sumOfSquares / totalWaste : 0;

  return {
    offcutCount: offcuts.length,
    reusableCount: reusable.length,
    scrapCount: scrap.length,
    totalReusableLength,
    avgOffcutLength,
    maxOffcutLength: Math.max(...offcuts),
    wasteQualityScore,
  };
}

export default function ComparisonReport({ primary, alternative, unit }: ComparisonReportProps) {
  const primaryTotalStock = primary.stockResults.reduce((s, r) => s + r.stockLength, 0);
  const altTotalStock = alternative.stockResults.reduce((s, r) => s + r.stockLength, 0);

  const primaryTotalCuts = primary.stockResults.reduce((s, r) => s + r.cuts.length, 0);
  const altTotalCuts = alternative.stockResults.reduce((s, r) => s + r.cuts.length, 0);

  // Kerf loss = usedLength - sum of actual cut lengths (the difference is kerf material)
  const calcKerfLoss = (results: OptimizationResult) =>
    results.stockResults.reduce((total, sr) => {
      const cutSum = sr.cuts.reduce((s, c) => s + c.length, 0);
      return total + (sr.usedLength - cutSum);
    }, 0);
  const primaryKerfLoss = calcKerfLoss(primary);
  const altKerfLoss = calcKerfLoss(alternative);

  // True efficiency: actual cut material / total stock (excludes kerf + remnant)
  const calcCutSum = (results: OptimizationResult) =>
    results.stockResults.reduce((total, sr) => total + sr.cuts.reduce((s, c) => s + c.length, 0), 0);
  const primaryCutSum = calcCutSum(primary);
  const altCutSum = calcCutSum(alternative);
  const primaryEfficiency = primaryTotalStock > 0 ? (primaryCutSum / primaryTotalStock) * 100 : 0;
  const altEfficiency = altTotalStock > 0 ? (altCutSum / altTotalStock) * 100 : 0;

  const pWaste = analyzeWaste(primary);
  const aWaste = analyzeWaste(alternative);

  const rows: ComparisonRow[] = [
    {
      label: "Total cuts placed",
      primaryValue: primaryTotalCuts.toString(),
      altValue: altTotalCuts.toString(),
      winner: compareNum(primaryTotalCuts, altTotalCuts),
    },
    {
      label: "Stock pieces used",
      primaryValue: primary.totalStockUsed.toString(),
      altValue: alternative.totalStockUsed.toString(),
      winner: compareNum(primary.totalStockUsed, alternative.totalStockUsed),
    },
    {
      label: "Total material",
      primaryValue: primaryTotalStock.toFixed(0),
      altValue: altTotalStock.toFixed(0),
      winner: compareNum(primaryTotalStock, altTotalStock),
      unit,
    },
    {
      label: "Efficiency",
      primaryValue: `${primaryEfficiency.toFixed(1)}%`,
      altValue: `${altEfficiency.toFixed(1)}%`,
      winner: compareNum(primaryEfficiency, altEfficiency, false),
    },
    {
      label: "Total remnant",
      primaryValue: primary.totalWaste.toFixed(1),
      altValue: alternative.totalWaste.toFixed(1),
      winner: compareNum(primary.totalWaste, alternative.totalWaste, false),
      unit,
    },
    {
      label: "Kerf loss",
      primaryValue: primaryKerfLoss.toFixed(1),
      altValue: altKerfLoss.toFixed(1),
      winner: compareNum(primaryKerfLoss, altKerfLoss),
      unit,
    },
    {
      label: "Priority cost",
      primaryValue: primary.totalCost.toString(),
      altValue: alternative.totalCost.toString(),
      winner: compareNum(primary.totalCost, alternative.totalCost),
    },
    {
      label: "Unplaced cuts",
      primaryValue: primary.unplacedCuts.length.toString(),
      altValue: alternative.unplacedCuts.length.toString(),
      winner: compareNum(primary.unplacedCuts.length, alternative.unplacedCuts.length),
    },
    // Remnant quality section
    {
      label: "Offcut pieces",
      primaryValue: pWaste.offcutCount.toString(),
      altValue: aWaste.offcutCount.toString(),
      winner: compareNum(pWaste.offcutCount, aWaste.offcutCount),
      separator: true,
    },
    {
      label: "Reusable offcuts",
      primaryValue: pWaste.reusableCount.toString(),
      altValue: aWaste.reusableCount.toString(),
      winner: compareNum(pWaste.reusableCount, aWaste.reusableCount, false),
    },
    {
      label: "Reusable length",
      primaryValue: pWaste.totalReusableLength.toFixed(1),
      altValue: aWaste.totalReusableLength.toFixed(1),
      winner: compareNum(pWaste.totalReusableLength, aWaste.totalReusableLength, false),
      unit,
    },
    {
      label: "Avg offcut size",
      primaryValue: pWaste.avgOffcutLength.toFixed(1),
      altValue: aWaste.avgOffcutLength.toFixed(1),
      winner: compareNum(pWaste.avgOffcutLength, aWaste.avgOffcutLength, false),
      unit,
    },
    {
      label: "Biggest offcut",
      primaryValue: pWaste.maxOffcutLength.toFixed(1),
      altValue: aWaste.maxOffcutLength.toFixed(1),
      winner: compareNum(pWaste.maxOffcutLength, aWaste.maxOffcutLength, false),
      unit,
    },
    {
      label: "Remnant quality score",
      primaryValue:
        pWaste.wasteQualityScore === Infinity ? "∞" : pWaste.wasteQualityScore.toFixed(1),
      altValue:
        aWaste.wasteQualityScore === Infinity ? "∞" : aWaste.wasteQualityScore.toFixed(1),
      winner: compareNum(pWaste.wasteQualityScore, aWaste.wasteQualityScore, false),
    },
  ];

  return (
    <div className="island-shell rounded-2xl p-5 rise-in">
      <h3 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2 mb-4">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/15 text-xs font-bold text-purple-500">
          ⚖
        </span>
        Comparison Report
      </h3>

      {/* Overview */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 mb-4">
        <div className="flex items-center justify-center gap-3">
          <div className="text-center flex-1 rounded-lg p-3 border border-[var(--line)]">
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)] mb-1">
              Primary (A)
            </div>
            <div className="text-2xl font-bold text-[var(--lagoon-deep)] tabular-nums">
              {primaryEfficiency.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--sea-ink-soft)]">efficiency</div>
          </div>

          <div className="text-xl font-bold text-[var(--sea-ink-soft)]">vs</div>

          <div className="text-center flex-1 rounded-lg p-3 border border-[var(--line)]">
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)] mb-1">
              Alternative (B)
            </div>
            <div className="text-2xl font-bold text-purple-500 tabular-nums">
              {altEfficiency.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--sea-ink-soft)]">efficiency</div>
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--sea-ink-soft)] border-b border-[var(--line)]">
              <th className="pb-2 pr-2 font-semibold">Metric</th>
              <th className="pb-2 pr-2 font-semibold text-right text-[var(--lagoon-deep)]">
                Primary (A)
              </th>
              <th className="pb-2 font-semibold text-right text-purple-500">Alternative (B)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.label}
                className={
                  row.separator
                    ? "border-t-2 border-[var(--line)]"
                    : i > 0
                      ? "border-t border-[var(--line)]"
                      : ""
                }
              >
                <td className="py-2 pr-2 text-sm text-[var(--sea-ink)]">
                  {row.label}
                  {row.label === "Remnant quality score" && (
                    <span
                      className="ml-1 text-[10px] text-[var(--sea-ink-soft)] cursor-help"
                      title="sum(offcut²) ÷ sum(offcut). Higher = remnant is concentrated in fewer, larger pieces = better."
                    >
                      ⓘ
                    </span>
                  )}
                </td>
                <td
                  className={`py-2 pr-2 text-right tabular-nums font-semibold ${
                    row.winner === "primary"
                      ? "text-[var(--lagoon-deep)]"
                      : "text-[var(--sea-ink-soft)]"
                  }`}
                >
                  {row.primaryValue}
                  {row.unit ? ` ${row.unit}` : ""}
                  {row.winner === "primary" && (
                    <span className="ml-1 text-green-500 text-[10px]">✓</span>
                  )}
                </td>
                <td
                  className={`py-2 text-right tabular-nums font-semibold ${
                    row.winner === "alt" ? "text-purple-500" : "text-[var(--sea-ink-soft)]"
                  }`}
                >
                  {row.altValue}
                  {row.unit ? ` ${row.unit}` : ""}
                  {row.winner === "alt" && (
                    <span className="ml-1 text-green-500 text-[10px]">✓</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remnant quality explanation */}
      <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
        <p className="text-xs text-[var(--sea-ink-soft)]">
          <strong className="text-[var(--sea-ink)]">💡 Remnant Quality Score</strong> = sum(offcut²)
          ÷ sum(offcut). A higher score means remnant is concentrated in fewer, larger offcuts
          — a single 1000mm offcut scores 10× higher than ten 100mm offcuts.
          — a single 1000mm offcut scores 10× higher than ten 100mm offcuts.
        </p>
      </div>

      {/* Waste comparison bar */}
      <div className="mt-4">
        <div className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)] mb-2">
          Remnant Comparison
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-[var(--lagoon-deep)] font-semibold w-6">A</span>
          <div className="flex-1 h-3 rounded-full bg-[var(--surface)] border border-[var(--line)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, primary.totalWastePercent)}%`,
                background:
                  primary.totalWastePercent <= alternative.totalWastePercent
                    ? "linear-gradient(90deg, var(--lagoon), var(--palm))"
                    : "linear-gradient(90deg, #f59e0b, #ef4444)",
              }}
            />
          </div>
          <span
            className={`text-xs tabular-nums font-semibold w-14 text-right ${getWasteColorClass(primary.totalWastePercent)}`}
          >
            {primary.totalWastePercent.toFixed(1)}%
          </span>
        </div>
        <div className="flex gap-2 items-center mt-1">
          <span className="text-xs text-purple-500 font-semibold w-6">B</span>
          <div className="flex-1 h-3 rounded-full bg-[var(--surface)] border border-[var(--line)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, alternative.totalWastePercent)}%`,
                background:
                  alternative.totalWastePercent <= primary.totalWastePercent
                    ? "linear-gradient(90deg, #a855f7, #7c3aed)"
                    : "linear-gradient(90deg, #f59e0b, #ef4444)",
              }}
            />
          </div>
          <span
            className={`text-xs tabular-nums font-semibold w-14 text-right ${getWasteColorClass(alternative.totalWastePercent)}`}
          >
            {alternative.totalWastePercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
