import { Plus, Trash2, CopyPlus, TriangleAlert } from "lucide-react";
import { useAltCuts } from "../store";
import type { CutItem } from "../types";

interface AltCutsTableProps {
  unit: string;
  onCopyFromPrimary: () => void;
  primaryCuts: CutItem[];
}

export default function AltCutsTable({
  unit,
  onCopyFromPrimary,
  primaryCuts,
}: AltCutsTableProps) {
  const { altCuts, addAltCut, updateAltCut, removeAltCut } = useAltCuts();

  const altTotal = altCuts.reduce((s, c) => s + c.length * c.quantity, 0);
  const primaryTotal = primaryCuts.reduce((s, c) => s + c.length * c.quantity, 0);
  const altQty = altCuts.reduce((s, c) => s + c.quantity, 0);
  const isMismatch = altCuts.length > 0 && altTotal !== primaryTotal;

  return (
    <div className="island-shell rounded-2xl p-5 rise-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/15 text-xs font-bold text-purple-500">
            B
          </span>
          Alternative Cuts
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCopyFromPrimary}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink-soft)] transition hover:border-purple-500/30 hover:text-purple-500 hover:bg-purple-500/5 hover:-translate-y-0.5 cursor-pointer"
          >
            <CopyPlus size={13} />
            Copy from A
          </button>
          <button
            type="button"
            onClick={addAltCut}
            className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-500 transition hover:bg-purple-500/20 hover:-translate-y-0.5 cursor-pointer"
          >
            <Plus size={14} />
            Add Cut
          </button>
        </div>
      </div>

      {altCuts.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-[var(--sea-ink-soft)]">No alternative cuts yet.</p>
          <button
            type="button"
            onClick={addAltCut}
            className="mt-2 text-xs text-purple-500 hover:text-purple-400 font-semibold cursor-pointer"
          >
            + Add your first alternative cut
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-[var(--sea-ink-soft)]">
                <th className="pb-2 pr-2 font-semibold">Label</th>
                <th className="pb-2 pr-2 font-semibold">Length ({unit})</th>
                <th className="pb-2 pr-2 font-semibold">Qty</th>
                <th className="pb-2 w-10 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {altCuts.map((c) => (
                <tr key={c.id} className="group">
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={c.label ?? ""}
                      onChange={(e) =>
                        updateAltCut(c.id, { label: e.target.value || undefined })
                      }
                      placeholder="Optional"
                      className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/40 outline-none focus:border-purple-500 transition-colors"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={c.length || ""}
                      onChange={(e) =>
                        updateAltCut(c.id, { length: Number(e.target.value) || 0 })
                      }
                      onBlur={(e) => {
                        if (!Number(e.target.value)) updateAltCut(c.id, { length: 0 });
                      }}
                      min={0}
                      step={1}
                      className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--sea-ink)] outline-none focus:border-purple-500 transition-colors tabular-nums"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      value={c.quantity || ""}
                      onChange={(e) =>
                        updateAltCut(c.id, { quantity: Math.round(Number(e.target.value)) || 0 })
                      }
                      onBlur={(e) => {
                        if (!Number(e.target.value)) updateAltCut(c.id, { quantity: 1 });
                      }}
                      min={1}
                      step={1}
                      className="w-16 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--sea-ink)] outline-none focus:border-purple-500 transition-colors tabular-nums"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeAltCut(c.id)}
                      className="rounded-lg p-1.5 text-[var(--sea-ink-soft)] transition hover:bg-red-500/10 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--line)]">
                <td className="py-2 pr-2 text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
                  Total
                </td>
                <td className="py-2 pr-2 text-sm font-bold text-[var(--sea-ink)] tabular-nums">
                  {altTotal.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-[var(--sea-ink-soft)]">({unit})</span>
                </td>
                <td className="py-2 pr-2 text-sm font-bold text-[var(--sea-ink)] tabular-nums">
                  {altQty}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Mismatch warning */}
      {isMismatch && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2.5">
          <TriangleAlert size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>Total mismatch:</strong> Alternative cuts total{" "}
            <strong className="tabular-nums">{altTotal.toLocaleString()} ({unit})</strong> vs
            primary cuts total{" "}
            <strong className="tabular-nums">{primaryTotal.toLocaleString()} ({unit})</strong>.
            {altTotal > primaryTotal
              ? " Alternative requires more material."
              : " Alternative requires less material."}
          </p>
        </div>
      )}
    </div>
  );
}
