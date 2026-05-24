import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getSavedSets, deleteSet, renameSet } from "../utils/localStorage";
import { useAppState } from "../store";
import type { CutlistSet } from "../types";
import { Trash2, Edit3, Check, X, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/saved")({ component: SavedPage });

function SavedPage() {
  const { dispatch } = useAppState();
  const navigate = useNavigate();
  const [sets, setSets] = useState<CutlistSet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    setSets(getSavedSets());
  }, []);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      deleteSet(id);
      setSets(getSavedSets());
    }
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameSet(id, editName.trim());
      setSets(getSavedSets());
    }
    setEditingId(null);
  };

  const handleLoad = (set: CutlistSet) => {
    dispatch({
      type: "LOAD_STATE",
      state: {
        stock: set.stock,
        cuts: set.cuts,
        kerf: set.kerf,
        unit: set.unit,
        currentSetName: set.name,
      },
    });
    void navigate({ to: "/" });
  };

  return (
    <main className="page-wrap px-4 pb-8 pt-6">
      <section className="mb-6 rise-in">
        <h2 className="display-title text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl mb-1">
          Saved Cutlists
        </h2>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          Load a previously saved cutlist set to continue working on it.
        </p>
      </section>

      {sets.length === 0 ? (
        <div className="island-shell rounded-2xl p-10 text-center rise-in">
          <p className="text-lg font-semibold text-[var(--sea-ink)] mb-2">No saved sets</p>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Save a cutlist from the optimizer page to see it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set, index) => (
            <div
              key={set.id}
              className="island-shell rounded-2xl p-5 rise-in hover:border-[color-mix(in_oklab,var(--lagoon-deep)_35%,var(--line))] transition-colors"
              style={{ animationDelay: `${index * 60 + 80}ms` }}
            >
              {/* Name */}
              <div className="flex items-center gap-2 mb-3">
                {editingId === set.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(set.id)}
                      className="flex-1 rounded-lg border border-[var(--lagoon)] bg-[var(--surface)] px-2.5 py-1 text-sm text-[var(--sea-ink)] outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(set.id)}
                      className="p-1 text-green-500 hover:bg-green-500/10 rounded cursor-pointer"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-[var(--sea-ink-soft)] hover:bg-red-500/10 rounded cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-[var(--sea-ink)] flex-1 truncate">
                      {set.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(set.id);
                        setEditName(set.name);
                      }}
                      className="p-1 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] rounded transition cursor-pointer"
                    >
                      <Edit3 size={13} />
                    </button>
                  </>
                )}
              </div>

              {/* Details */}
              <div className="flex gap-4 text-xs text-[var(--sea-ink-soft)] mb-3">
                <span>
                  <strong className="text-[var(--sea-ink)]">{set.stock.length}</strong> stock types
                </span>
                <span>
                  <strong className="text-[var(--sea-ink)]">{set.cuts.length}</strong> cut types
                </span>
                <span>
                  Kerf: {set.kerf} {set.unit}
                </span>
              </div>

              <div className="text-[10px] text-[var(--sea-ink-soft)] mb-4 tabular-nums">
                Updated{" "}
                {new Date(set.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleLoad(set)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-[rgba(79,184,178,0.3)] bg-[rgba(79,184,178,0.1)] px-3 py-2 text-xs font-semibold text-[var(--lagoon-deep)] transition hover:bg-[rgba(79,184,178,0.2)] hover:-translate-y-0.5 cursor-pointer"
                >
                  <FolderOpen size={13} />
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(set.id, set.name)}
                  className="rounded-full border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 hover:-translate-y-0.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
