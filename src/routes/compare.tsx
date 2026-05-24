import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAppState } from "../store";
import SummaryCard from "../components/SummaryCard";
import WasteSummary from "../components/WasteSummary";
import ComparisonReport from "../components/ComparisonReport";
import CopyableJson from "../components/CopyableJson";
import { ArrowLeft, ArrowRight, GitCompareArrows } from "lucide-react";

export const Route = createFileRoute("/compare")({ component: ComparePage });

function ComparePage() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const { results, altResults, unit } = state;

  const handleChoose = (choice: "primary" | "alt") => {
    const chosen = choice === "primary" ? results : altResults;
    if (!chosen) return;
    dispatch({ type: "SET_RESULTS", results: chosen });
    dispatch({
      type: "SET_CHOSEN_LABEL",
      label: choice === "primary" ? "Primary (A)" : "Alternative (B)",
    });
    void navigate({ to: "/results" });
  };

  if (!results || !altResults) {
    return (
      <main className="page-wrap px-4 pb-8 pt-6">
        <div className="island-shell rounded-2xl p-10 text-center rise-in">
          <p className="text-lg font-semibold text-[var(--sea-ink)] mb-2">
            No comparison available
          </p>
          <p className="text-sm text-[var(--sea-ink-soft)] mb-4">
            Run the optimizer with comparison mode enabled to see results here.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            <ArrowLeft size={16} />
            Back to Optimizer
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-4 mb-6 rise-in">
        <div>
          <h2 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl mb-1 flex items-center gap-3">
            <GitCompareArrows size={32} className="text-purple-500" />
            Comparison
          </h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {state.currentSetName !== "Untitled" ? `${state.currentSetName} — ` : ""}
            Compare two cut lists against the same stock
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[var(--lagoon)] print:hidden"
        >
          <ArrowLeft size={14} />
          Edit
        </Link>
      </section>

      {/* Comparison Report */}
      <section className="mb-8">
        <ComparisonReport primary={results} alternative={altResults} unit={unit} />
      </section>

      {/* ─── A vs B side by side ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* PRIMARY (A) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wider font-semibold text-[var(--lagoon-deep)] rise-in flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(79,184,178,0.15)] text-[10px] font-bold text-[var(--lagoon-deep)]">
                A
              </span>
              Primary Cuts
            </h3>
            <button
              type="button"
              onClick={() => handleChoose("primary")}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] px-4 py-2 text-xs font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.2)] hover:-translate-y-0.5 cursor-pointer print:hidden"
            >
              Use these cuts
              <ArrowRight size={14} />
            </button>
          </div>
          <SummaryCard results={results} unit={unit} />
          <WasteSummary results={results} unit={unit} />
        </div>

        {/* ALTERNATIVE (B) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-wider font-semibold text-purple-500 rise-in flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/15 text-[10px] font-bold text-purple-500">
                B
              </span>
              Alternative Cuts
            </h3>
            <button
              type="button"
              onClick={() => handleChoose("alt")}
              className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-500 transition hover:bg-purple-500/20 hover:-translate-y-0.5 cursor-pointer print:hidden"
            >
              Use these cuts
              <ArrowRight size={14} />
            </button>
          </div>
          <SummaryCard results={altResults} unit={unit} />
          <WasteSummary results={altResults} unit={unit} />
        </div>
      </div>

      {/* Choose actions (bottom) */}
      <div className="flex flex-wrap gap-3 justify-center mt-8 rise-in print:hidden">
        <button
          type="button"
          onClick={() => handleChoose("primary")}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[rgba(79,184,178,0.4)] bg-[rgba(79,184,178,0.08)] px-6 py-3 text-sm font-bold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.18)] cursor-pointer"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(79,184,178,0.2)] text-[10px] font-bold">
            A
          </span>
          Use Primary Cuts
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleChoose("alt")}
          className="inline-flex items-center gap-2 rounded-full border-2 border-purple-500/40 bg-purple-500/8 px-6 py-3 text-sm font-bold text-purple-500 transition hover:-translate-y-0.5 hover:bg-purple-500/15 cursor-pointer"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/20 text-[10px] font-bold">
            B
          </span>
          Use Alternative Cuts
          <ArrowRight size={16} />
        </button>
      </div>

      {/* JSON output (collapsible) */}
      <details className="mt-8 island-shell rounded-2xl p-5 print:hidden rise-in">
        <summary className="text-sm font-semibold text-[var(--sea-ink)] cursor-pointer">
          Raw JSON Output
        </summary>
        <CopyableJson data={{ inputs: { stock: state.stock, cuts: state.cuts, altCuts: state.altCuts, kerf: state.kerf, unit: state.unit }, primary: results, alternative: altResults }} />
      </details>
    </main>
  );
}
