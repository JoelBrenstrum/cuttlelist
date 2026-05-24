import { useAppState } from "../store";

export default function SettingsBar() {
  const { state, dispatch } = useAppState();

  return (
    <div className="island-shell rounded-2xl p-5 rise-in" style={{ animationDelay: "240ms" }}>
      <h2 className="text-base font-semibold text-[var(--sea-ink)] flex items-center gap-2 mb-4">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(79,184,178,0.12)] text-xs">
          ⚙
        </span>
        Settings
      </h2>
      <div className="flex flex-wrap items-end gap-6">
        {/* Kerf / Blade Width */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="kerf-input"
            className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]"
          >
            Kerf / Blade Width ({state.unit})
          </label>
          <input
            id="kerf-input"
            type="number"
            value={state.kerf}
            onChange={(e) =>
              dispatch({ type: "SET_KERF", kerf: Math.max(0, Number(e.target.value)) })
            }
            min={0}
            step={0.1}
            className="w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] transition-colors tabular-nums"
          />
        </div>

        {/* Unit Toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]">
            Unit
          </label>
          <div className="inline-flex rounded-lg border border-[var(--line)] overflow-hidden">
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_UNIT", unit: "mm" })}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                state.unit === "mm"
                  ? "bg-[var(--lagoon)] text-white"
                  : "bg-[var(--surface)] text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
              }`}
            >
              mm
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_UNIT", unit: "in" })}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                state.unit === "in"
                  ? "bg-[var(--lagoon)] text-white"
                  : "bg-[var(--surface)] text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
              }`}
            >
              in
            </button>
          </div>
        </div>

        {/* Current Set Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="set-name-input"
            className="text-xs uppercase tracking-wider font-semibold text-[var(--sea-ink-soft)]"
          >
            Set Name
          </label>
          <input
            id="set-name-input"
            type="text"
            value={state.currentSetName}
            onChange={(e) => dispatch({ type: "SET_NAME", name: e.target.value })}
            className="w-44 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--sea-ink)] outline-none focus:border-[var(--lagoon)] transition-colors"
            placeholder="Name this cutlist"
          />
        </div>
      </div>
    </div>
  );
}
