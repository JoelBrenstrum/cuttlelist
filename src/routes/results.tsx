import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppState } from "../store";
import CutDiagram from "../components/CutDiagram";
import SummaryCard from "../components/SummaryCard";
import WasteSummary from "../components/WasteSummary";
import { ArrowLeft, Printer } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/results")({ component: ResultsPage });

function ResultsPage() {
  const { state } = useAppState();
  const { results, unit } = state;

  // Build a global color map: unique cut lengths get consistent colors
  const globalColorMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!results) return map;
    let colorIndex = 0;
    for (const stockResult of results.stockResults) {
      for (const cut of stockResult.cuts) {
        const key = cut.length.toString();
        if (!map.has(key)) {
          map.set(key, colorIndex++);
        }
      }
    }
    return map;
  }, [results]);

  if (!results) {
    return (
      <main className="page-wrap px-4 pb-8 pt-6">
        <div className="island-shell rounded-2xl p-10 text-center rise-in">
          <p className="text-lg font-semibold text-[var(--sea-ink)] mb-2">No results yet</p>
          <p className="text-sm text-[var(--sea-ink-soft)] mb-4">
            Go to the optimizer and run a calculation first.
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
          <h2 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl mb-1">
            Cut Sheet
            {state.chosenLabel && (
              <span className="ml-2 text-lg font-semibold text-[var(--sea-ink-soft)]">
                — {state.chosenLabel}
              </span>
            )}
          </h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {state.currentSetName !== "Untitled" ? `${state.currentSetName} — ` : ""}
            Optimized layout for {results.totalStockUsed} stock piece
            {results.totalStockUsed !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[var(--lagoon)]"
          >
            <ArrowLeft size={14} />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)] cursor-pointer"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>
      </section>

      {/* Summary */}
      <section className="mb-6">
        <SummaryCard results={results} unit={unit} />
      </section>

      {/* Cut diagrams */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)] rise-in">
          Stock Layouts ({results.stockResults.length})
        </h3>
        {results.stockResults.map((result, index) => (
          <CutDiagram
            key={result.stockId}
            result={result}
            index={index}
            unit={unit}
            kerf={state.kerf}
            globalColorMap={globalColorMap}
          />
        ))}
      </section>

      {/* Waste breakdown */}
      <section className="mt-6">
        <WasteSummary results={results} unit={unit} />
      </section>

      {/* JSON output (collapsible) */}
      <details className="mt-6 island-shell rounded-2xl p-5 print:hidden rise-in">
        <summary className="text-sm font-semibold text-[var(--sea-ink)] cursor-pointer">
          Raw JSON Output
        </summary>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-[var(--surface)] border border-[var(--line)] p-4 text-xs text-[var(--sea-ink-soft)] leading-relaxed">
          {JSON.stringify(results, null, 2)}
        </pre>
      </details>
    </main>
  );
}
