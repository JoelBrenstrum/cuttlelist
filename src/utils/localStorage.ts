import type { CutlistSet, StockType, CutItem } from "../types";

const STORAGE_KEY = "cuttlelist-saved-sets";

export function getSavedSets(): CutlistSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CutlistSet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSet(set: CutlistSet): void {
  const sets = getSavedSets();
  const existingIndex = sets.findIndex((s) => s.id === set.id);
  if (existingIndex >= 0) {
    sets[existingIndex] = { ...set, updatedAt: new Date().toISOString() };
  } else {
    sets.push(set);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

export function deleteSet(id: string): void {
  const sets = getSavedSets().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

export function renameSet(id: string, name: string): void {
  const sets = getSavedSets();
  const set = sets.find((s) => s.id === id);
  if (set) {
    set.name = name;
    set.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  }
}

export function createNewSet(
  name: string,
  stock: StockType[],
  cuts: CutItem[],
  kerf: number,
  unit: "mm" | "in",
): CutlistSet {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    stock,
    cuts,
    kerf,
    unit,
  };
}
