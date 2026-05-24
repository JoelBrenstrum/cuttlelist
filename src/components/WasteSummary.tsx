import { useMemo } from "react";
import type { OptimizationResult } from "../types";

interface WasteBreakdown {
  stockIndex: number;
  stockLabel: string;
  stockLength: number;
  wasteLength: number;
  wastePercent: number;
}

function getWasteTag(length: number, minUsefulLength: number): "reusable" | "scrap" {
  return length >= minUsefulLength ? "reusable" : "scrap";
}

interface WasteSummaryProps {
  results: OptimizationResult;
  unit: string;
}

export default function WasteSummary({ results, unit }: WasteSummaryProps) {
  const wasteBreakdown = useMemo(() => {
    return results.stockResults
      .map<WasteBreakdown>((sr, i) => ({
        stockIndex: i,
        stockLabel: sr.stockLabel || `Stock ${i + 1}`,
        stockLength: sr.stockLength,
        wasteLength: sr.wasteLength,
        wastePercent: sr.wastePercent,
      }))
      .filter((w) => w.wasteLength > 0)
      .sort((a, b) => b.wasteLength - a.wasteLength);
  }, [results]);

  // Consider anything >= 10% of the smallest stock length as "potentially reusable"
  const minStockLength = Math.min(...results.stockResults.map((sr) => sr.stockLength));
  const minUsefulLength = minStockLength * 0.1;

  const reusablePieces = wasteBreakdown.filter(
    (w) => getWasteTag(w.wasteLength, minUsefulLength) === "reusable",
  );
  const scrapPieces = wasteBreakdown.filter(
    (w) => getWasteTag(w.wasteLength, minUsefulLength) === "scrap",
  );

  if (wasteBreakdown.length === 0) {
    return (
      <div className="island-shell rounded-2xl p-5 rise-in">
        <h3 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2 mb-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-green-500/15 text-xs font-bold text-green-500">
            ♻
          </span>
          Remnant Breakdown
        </h3>
        <p className="text-sm text-green-500 font-medium">
          🎉 Zero remnant — perfect fit across all stock!
        </p>
      </div>
    );
  }

  return (
    <div className="island-shell rounded-2xl p-5 rise-in">
      <h3 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2 mb-4">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(79,184,178,0.12)] text-xs">
          ♻
        </span>
        Remnant Breakdown
      </h3>

      {/* Summary counts */}
      <div className="flex gap-4 text-xs text-[var(--sea-ink-soft)] mb-4">
        <span>
          <strong className="text-[var(--sea-ink)]">{wasteBreakdown.length}</strong> offcut
          {wasteBreakdown.length !== 1 ? "s" : ""} total
        </span>
        {reusablePieces.length > 0 && (
          <span>
            <strong className="text-amber-500">{reusablePieces.length}</strong> potentially reusable
          </span>
        )}
        {scrapPieces.length > 0 && (
          <span>
            <strong className="text-[var(--sea-ink-soft)]">{scrapPieces.length}</strong> scrap
          </span>
        )}
      </div>

      {/* Waste pieces table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--sea-ink-soft)] border-b border-[var(--line)]">
              <th className="pb-2 pr-2 font-semibold">#</th>
              <th className="pb-2 pr-2 font-semibold">Source</th>
              <th className="pb-2 pr-2 font-semibold text-right">
                Offcut ({unit})
              </th>
              <th className="pb-2 pr-2 font-semibold text-right">% of stock</th>
              <th className="pb-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {wasteBreakdown.map((w) => {
              const tag = getWasteTag(w.wasteLength, minUsefulLength);
              return (
                <tr key={w.stockIndex} className="group">
                  <td className="py-2 pr-2 text-xs text-[var(--sea-ink-soft)] tabular-nums">
                    {w.stockIndex + 1}
                  </td>
                  <td className="py-2 pr-2 text-sm text-[var(--sea-ink)]">{w.stockLabel}</td>
                  <td className="py-2 pr-2 text-right tabular-nums font-semibold text-[var(--sea-ink)]">
                    {w.wasteLength.toFixed(1)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-[var(--sea-ink-soft)]">
                    {w.wastePercent.toFixed(1)}%
                  </td>
                  <td className="py-2">
                    {tag === "reusable" ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Reusable offcut
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--sea-ink-soft)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]" />
                        Scrap
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reusable pieces callout */}
      {reusablePieces.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>💡 Tip:</strong> {reusablePieces.length} offcut
            {reusablePieces.length > 1 ? "s are" : " is"} large enough to be reusable. Consider
            adding {reusablePieces.length > 1 ? "them" : "it"} as stock in a future cutlist:{" "}
            {reusablePieces.map((w) => `${w.wasteLength.toFixed(1)} (${unit})`).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
