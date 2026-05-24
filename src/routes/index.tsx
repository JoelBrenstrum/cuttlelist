import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAppState } from "../store";
import { optimize } from "../optimizer";
import { saveSet, createNewSet } from "../utils/localStorage";
import StockTable from "../components/StockTable";
import CutsTable from "../components/CutsTable";
import AltCutsTable from "../components/AltCutsTable";
import SettingsBar from "../components/SettingsBar";
import { Scissors, Save, GitCompareArrows } from "lucide-react";

export const Route = createFileRoute("/")({ component: InputPage });

function InputPage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();

  const handleOptimize = () => {
    try {
      const results = optimize(state.stock, state.cuts, state.kerf);
      dispatch({ type: "SET_RESULTS", results });

      // If alt cuts are enabled and have items, run alt optimization too
      if (state.altEnabled && state.altCuts.length > 0) {
        const altResults = optimize(state.stock, state.altCuts, state.kerf);
        dispatch({ type: "SET_ALT_RESULTS", results: altResults });
        dispatch({ type: "SET_CHOSEN_LABEL", label: null });
        void navigate({ to: "/compare" });
      } else {
        dispatch({ type: "SET_ALT_RESULTS", results: null });
        dispatch({ type: "SET_CHOSEN_LABEL", label: null });
        void navigate({ to: "/results" });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Optimization failed");
    }
  };

  const handleSave = () => {
    const newSet = createNewSet(
      state.currentSetName,
      state.stock,
      state.cuts,
      state.kerf,
      state.unit,
    );
    saveSet(newSet);
    alert(`Saved "${state.currentSetName}" ✓`);
  };

  const handleCopyFromPrimary = () => {
    const copiedCuts = state.cuts.map((c) => ({
      ...c,
      id: crypto.randomUUID(),
    }));
    dispatch({ type: "SET_ALT_CUTS", cuts: copiedCuts });
  };

  const totalCuts = state.cuts.reduce((sum, c) => sum + c.quantity, 0);
  const totalAltCuts = state.altCuts.reduce((sum, c) => sum + c.quantity, 0);
  const totalStock = state.stock.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      {/* Hero */}
      <section className="mb-6 rise-in">
        <h2 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl mb-1">
          Cut Optimizer
        </h2>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Define your stock and cuts, then optimize for minimal waste.
        </p>
      </section>

      {/* Input sections */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <StockTable unit={state.unit} />
          <SettingsBar />
        </div>
        <div className="flex flex-col gap-5">
          <CutsTable unit={state.unit} />

          {/* Stats preview */}
          <div className="island-shell rounded-2xl p-5 rise-in" style={{ animationDelay: "320ms" }}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-6">
                <div>
                  <span className="text-[var(--sea-ink-soft)]">Stock types: </span>
                  <strong className="text-[var(--sea-ink)] tabular-nums">
                    {state.stock.length}
                  </strong>
                  <span className="text-[var(--sea-ink-soft)] ml-1">({totalStock} pcs)</span>
                </div>
                <div>
                  <span className="text-[var(--sea-ink-soft)]">Cut types: </span>
                  <strong className="text-[var(--sea-ink)] tabular-nums">
                    {state.cuts.length}
                  </strong>
                  <span className="text-[var(--sea-ink-soft)] ml-1">({totalCuts} pcs)</span>
                </div>
              </div>
              <span className="text-xs text-[var(--sea-ink-soft)]">
                {totalCuts <= 15 ? "✨ Exact mode" : "⚡ Heuristic mode"}
              </span>
            </div>
          </div>

          {/* Alternative cuts comparison toggle */}
          <div className="rise-in" style={{ animationDelay: "380ms" }}>
            <button
              type="button"
              onClick={() => dispatch({ type: "TOGGLE_ALT", enabled: !state.altEnabled })}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 cursor-pointer ${
                state.altEnabled
                  ? "border-2 border-purple-500/50 bg-purple-500/10 text-purple-500"
                  : "border border-[var(--line)] bg-[var(--surface)] text-[var(--sea-ink-soft)] hover:border-purple-500/30 hover:text-purple-500"
              }`}
            >
              <GitCompareArrows size={16} />
              {state.altEnabled ? "Comparison mode ON" : "Compare with alternative cuts"}
            </button>
          </div>

          {/* Alternative cuts table */}
          {state.altEnabled && (
            <>
              <AltCutsTable unit={state.unit} onCopyFromPrimary={handleCopyFromPrimary} primaryCuts={state.cuts} />
              {state.altCuts.length > 0 && (
                <div className="island-shell rounded-2xl p-4 rise-in text-xs text-[var(--sea-ink-soft)]">
                  <div className="flex items-center justify-between">
                    <div>
                      Alt cut types:{" "}
                      <strong className="text-purple-500 tabular-nums">
                        {state.altCuts.length}
                      </strong>
                      <span className="ml-1">({totalAltCuts} pcs)</span>
                      <span className="ml-2">
                        {totalAltCuts <= 15 ? "✨ Exact" : "⚡ Heuristic"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mt-6 rise-in" style={{ animationDelay: "400ms" }}>
        <button
          type="button"
          onClick={handleOptimize}
          disabled={state.stock.length === 0 || state.cuts.length === 0}
          className="optimize-btn inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Scissors size={16} />
          {state.altEnabled && state.altCuts.length > 0
            ? "Optimize & Compare"
            : "Optimize Cuts"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--sea-ink)] transition hover:-translate-y-0.5 hover:border-[var(--lagoon)] cursor-pointer"
        >
          <Save size={16} />
          Save Set
        </button>
      </div>
    </main>
  );
}
