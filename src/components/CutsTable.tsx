import { Plus, Trash2 } from "lucide-react";
import { useCuts } from "../store";

export default function CutsTable({ unit }: { unit: string }) {
  const { cuts, addCut, updateCut, removeCut } = useCuts();

  return (
    <div className="island-shell rounded-2xl p-5 rise-in" style={{ animationDelay: "160ms" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(47,106,74,0.18)] text-xs font-bold text-[var(--palm)]">
            C
          </span>
          Required Cuts
        </h2>
        <button
          type="button"
          onClick={addCut}
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(47,106,74,0.3)] bg-[rgba(47,106,74,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--palm)] transition hover:bg-[rgba(47,106,74,0.2)] hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus size={14} />
          Add Cut
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[var(--sea-ink-soft)]">
              <th className="hidden sm:table-cell pb-2 pr-2 font-semibold">Label</th>
              <th className="pb-2 pr-2 font-semibold"><span className="hidden sm:inline">Length ({unit})</span><span className="sm:hidden">Len</span></th>
              <th className="pb-2 pr-2 font-semibold">Qty</th>
              <th className="pb-2 w-10 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {cuts.map((c) => (
              <tr key={c.id} className="group">
                <td className="hidden sm:table-cell py-2 pr-2">
                  <input
                    type="text"
                    value={c.label ?? ""}
                    onChange={(e) => updateCut(c.id, { label: e.target.value || undefined })}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 min-h-[44px] sm:min-h-0 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/40 outline-none focus:border-[var(--lagoon)] transition-colors"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={c.length || ""}
                    onChange={(e) =>
                      updateCut(c.id, { length: Number(e.target.value) || 0 })
                    }
                    onBlur={(e) => {
                      if (!Number(e.target.value)) updateCut(c.id, { length: 0 });
                    }}
                    min={0}
                    step={1}
                    className="w-full min-w-[60px] sm:w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 min-h-[44px] sm:min-h-0 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] transition-colors tabular-nums"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    value={c.quantity || ""}
                    onChange={(e) =>
                      updateCut(c.id, { quantity: Math.round(Number(e.target.value)) || 0 })
                    }
                    onBlur={(e) => {
                      if (!Number(e.target.value)) updateCut(c.id, { quantity: 1 });
                    }}
                    min={1}
                    step={1}
                    className="w-full min-w-[48px] sm:w-16 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 min-h-[44px] sm:min-h-0 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] transition-colors tabular-nums"
                  />
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() => removeCut(c.id)}
                    disabled={cuts.length <= 1}
                    className="rounded-lg p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-[var(--sea-ink-soft)] transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--line)]">
              <td className="hidden sm:table-cell py-2 pr-2 text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
                Total
              </td>
              <td className="py-2 pr-2 text-xs sm:text-sm font-bold text-[var(--sea-ink)] tabular-nums">
                <span className="sm:hidden text-[var(--sea-ink-soft)] font-semibold uppercase tracking-wider text-xs mr-1">Total</span>
                {cuts.reduce((s, c) => s + c.length * c.quantity, 0).toLocaleString()}{" "}
                <span className="text-xs font-normal text-[var(--sea-ink-soft)]">({unit})</span>
              </td>
              <td className="py-2 pr-2 text-sm font-bold text-[var(--sea-ink)] tabular-nums">
                {cuts.reduce((s, c) => s + c.quantity, 0)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
