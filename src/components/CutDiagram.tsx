import type { StockResult } from "../types";

// 8 distinct, vibrant hues for cut segments
const CUT_COLORS = [
  "hsl(170, 70%, 45%)", // teal
  "hsl(220, 70%, 55%)", // blue
  "hsl(340, 70%, 55%)", // rose
  "hsl(35, 85%, 52%)", // amber
  "hsl(280, 60%, 55%)", // purple
  "hsl(140, 60%, 42%)", // green
  "hsl(15, 80%, 55%)", // coral
  "hsl(195, 75%, 48%)", // cyan
];

function getColorForCut(index: number): string {
  return CUT_COLORS[index % CUT_COLORS.length];
}

function getWasteClass(percent: number): string {
  if (percent <= 10) return "text-green-500";
  if (percent <= 25) return "text-amber-500";
  return "text-red-500";
}

interface CutDiagramProps {
  result: StockResult;
  index: number;
  unit: string;
  kerf: number;
  globalColorMap: Map<string, number>;
}

export default function CutDiagram({ result, index, unit, kerf, globalColorMap }: CutDiagramProps) {
  const totalLength = result.stockLength;

  // Border width between cuts: proportional to kerf, min 1px, max 4px
  const separatorWidth = Math.max(1, Math.min(4, Math.round(kerf * 0.5 + 1)));

  return (
    <div className="rise-in" style={{ animationDelay: `${index * 60 + 100}ms` }}>
      <div className="island-shell rounded-xl p-4 hover:border-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line))] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(79,184,178,0.15)] text-[10px] font-bold text-[var(--lagoon-deep)] tabular-nums">
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-[var(--sea-ink)]">
              {result.stockLabel || `Stock ${index + 1}`}
            </span>
            <span className="text-xs text-[var(--sea-ink-soft)]">
              {result.stockLength} {unit}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs tabular-nums">
            <span className="text-[var(--sea-ink-soft)]">
              Used:{" "}
              <strong className="text-[var(--sea-ink)]">
                {result.usedLength.toFixed(1)} {unit}
              </strong>
            </span>
            <span className={getWasteClass(result.wastePercent)}>
              Remnant:{" "}
              <strong>
                {result.wasteLength.toFixed(1)} {unit}
              </strong>
              <span className="ml-1">({result.wastePercent.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        {/* Bar visualization */}
        <div className="relative h-12 rounded-lg overflow-hidden border border-[var(--line)] bg-[var(--surface)]">
          {/* Cut segments */}
          {
            result.cuts.reduce<{ elements: React.ReactNode[]; offset: number }>(
              (acc, cut, cutIndex) => {
                const widthPercent = (cut.length / totalLength) * 100;
                const leftPercent = (acc.offset / totalLength) * 100;
                const colorIdx = globalColorMap.get(cut.length.toString()) ?? cutIndex;
                const color = getColorForCut(colorIdx);

                const isLastCut = cutIndex === result.cuts.length - 1;

                acc.elements.push(
                  <div
                    key={`${cut.cutId}-${cutIndex}`}
                    className="absolute inset-y-0 flex items-center justify-center text-white text-[10px] font-bold transition-all duration-300 group/segment"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: color,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15)`,
                      borderRight: isLastCut
                        ? "none"
                        : `${separatorWidth}px solid rgba(0,0,0,0.35)`,
                    }}
                    title={`${cut.label ? `${cut.label}: ` : ""}${cut.length} (${unit})`}
                  >
                    {widthPercent > 6 && (
                      <span className="truncate px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                        {cut.label || cut.length}
                      </span>
                    )}
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/segment:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="rounded-md bg-[var(--sea-ink)] px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                        {cut.label ? `${cut.label}: ` : ""}
                        {cut.length} ({unit})
                      </div>
                    </div>
                  </div>,
                );

                acc.offset += cut.length;
                return acc;
              },
              { elements: [], offset: 0 },
            ).elements
          }

          {/* Remnant segment */}
          {result.wasteLength > 0 && (
            <div
              className="absolute inset-y-0 right-0 flex items-center justify-center"
              style={{
                width: `${(result.wasteLength / totalLength) * 100}%`,
                background: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 3px,
                  rgba(120,120,120,0.15) 3px,
                  rgba(120,120,120,0.15) 6px
                )`,
                backgroundColor: "rgba(100,100,100,0.08)",
              }}
              title={`Remnant: ${result.wasteLength.toFixed(1)} ${unit}`}
            >
              {(result.wasteLength / totalLength) * 100 > 8 && (
                <span className="text-[10px] text-[var(--sea-ink-soft)] font-medium tabular-nums">
                  {result.wasteLength.toFixed(1)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cut list detail */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {result.cuts.map((cut, cutIndex) => {
            const colorIdx = globalColorMap.get(cut.length.toString()) ?? cutIndex;
            const color = getColorForCut(colorIdx);
            return (
              <span
                key={`${cut.cutId}-tag-${cutIndex}`}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-[var(--line)]"
                style={{ backgroundColor: `${color}15`, color }}
              >
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                {cut.label ? `${cut.label} (${cut.length})` : cut.length} ({unit})
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
