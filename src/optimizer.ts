import type { StockType, CutItem, CutPlacement, StockResult, OptimizationResult } from "./types";

// ---------------------------------------------------------------------------
// Internal types for the optimizer
// ---------------------------------------------------------------------------

/** An expanded individual cut instance (quantity=1) */
interface ExpandedCut {
  originalId: string;
  length: number;
  label?: string;
}

/** An expanded individual stock piece (quantity=1) */
interface ExpandedStock {
  originalId: string;
  length: number;
  priority: number;
  label?: string;
}

/** A bin (stock piece) with cuts placed into it */
interface Bin {
  stock: ExpandedStock;
  cuts: ExpandedCut[];
  remaining: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXACT_THRESHOLD = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Expand items by their quantity into individual instances.
 * Items with quantity <= 0 are skipped.
 */
function expandCuts(cuts: CutItem[]): ExpandedCut[] {
  const expanded: ExpandedCut[] = [];
  for (const cut of cuts) {
    for (let i = 0; i < cut.quantity; i++) {
      expanded.push({
        originalId: cut.id,
        length: cut.length,
        label: cut.label,
      });
    }
  }
  return expanded;
}

function expandStock(stock: StockType[]): ExpandedStock[] {
  const expanded: ExpandedStock[] = [];
  for (const s of stock) {
    for (let i = 0; i < s.quantity; i++) {
      expanded.push({
        originalId: s.id,
        length: s.length,
        priority: s.priority,
        label: s.label,
      });
    }
  }
  // Sort by priority ascending, then by length ascending (prefer shorter/cheaper first)
  expanded.sort((a, b) => a.priority - b.priority || a.length - b.length);
  return expanded;
}

/**
 * Calculate the remaining space in a bin after placing a cut, considering kerf.
 * - First cut: remaining = stockLength - cutLength (no leading kerf)
 * - Subsequent cuts: remaining -= (cutLength + kerf)
 */
function remainingAfterPlacement(bin: Bin, cutLength: number, kerf: number): number {
  if (bin.cuts.length === 0) {
    return bin.remaining - cutLength;
  }
  return bin.remaining - cutLength - kerf;
}

/**
 * Check if a cut can fit in a bin.
 */
function canFit(bin: Bin, cutLength: number, kerf: number): boolean {
  return remainingAfterPlacement(bin, cutLength, kerf) >= -1e-9;
}

/**
 * Place a cut into a bin (mutates the bin).
 */
function placeCut(bin: Bin, cut: ExpandedCut, kerf: number): void {
  bin.remaining = remainingAfterPlacement(bin, cut.length, kerf);
  bin.cuts.push(cut);
}

/**
 * Create a new bin from an expanded stock piece.
 */
function createBin(stock: ExpandedStock): Bin {
  return {
    stock,
    cuts: [],
    remaining: stock.length,
  };
}

/**
 * Calculate the total priority cost of a set of bins (only bins with cuts).
 */
function totalCost(bins: Bin[]): number {
  let cost = 0;
  for (const bin of bins) {
    if (bin.cuts.length > 0) {
      cost += bin.stock.priority;
    }
  }
  return cost;
}

/**
 * Deep clone bins for backtracking.
 */
function cloneBins(bins: Bin[]): Bin[] {
  return bins.map((bin) => ({
    stock: bin.stock,
    cuts: [...bin.cuts],
    remaining: bin.remaining,
  }));
}

/**
 * Convert bins to the final OptimizationResult.
 */
function buildResult(bins: Bin[], unplacedCuts: ExpandedCut[], kerf: number): OptimizationResult {
  const activeBins = bins.filter((b) => b.cuts.length > 0);

  const stockResults: StockResult[] = activeBins.map((bin) => {
    const cuts: CutPlacement[] = bin.cuts.map((c) => ({
      cutId: c.originalId,
      length: c.length,
      label: c.label,
    }));

    // Calculate used length: sum of cut lengths + kerfs between cuts
    const cutLengthSum = bin.cuts.reduce((sum, c) => sum + c.length, 0);
    const kerfCount = Math.max(0, bin.cuts.length - 1);
    const usedLength = cutLengthSum + kerfCount * kerf;
    const wasteLength = bin.stock.length - usedLength;
    const wastePercent = bin.stock.length > 0 ? (wasteLength / bin.stock.length) * 100 : 0;

    return {
      stockId: bin.stock.originalId,
      stockLength: bin.stock.length,
      stockLabel: bin.stock.label,
      priority: bin.stock.priority,
      cuts,
      usedLength,
      wasteLength,
      wastePercent,
    };
  });

  const totalStockLength = stockResults.reduce((sum, sr) => sum + sr.stockLength, 0);
  const totalWaste = stockResults.reduce((sum, sr) => sum + sr.wasteLength, 0);
  const totalWastePercent = totalStockLength > 0 ? (totalWaste / totalStockLength) * 100 : 0;

  // Aggregate unplaced cuts back by original ID
  const unplacedMap = new Map<string, CutItem>();
  for (const uc of unplacedCuts) {
    const existing = unplacedMap.get(uc.originalId);
    if (existing) {
      existing.quantity += 1;
    } else {
      unplacedMap.set(uc.originalId, {
        id: uc.originalId,
        length: uc.length,
        quantity: 1,
        label: uc.label,
      });
    }
  }

  return {
    stockResults,
    totalWaste,
    totalWastePercent,
    totalStockUsed: activeBins.length,
    totalCost: stockResults.reduce((sum, sr) => sum + sr.priority, 0),
    unplacedCuts: Array.from(unplacedMap.values()),
  };
}

// ---------------------------------------------------------------------------
// Sort stock types for opening new bins: by priority ASC, then best-fit length
// ---------------------------------------------------------------------------

/**
 * Get the unique stock types available (deduplicated), sorted for bin opening.
 * For the exact solver we want to try each stock type when opening a new bin.
 */
function getUniqueStockTypes(
  expandedStock: ExpandedStock[],
  usedCounts: Map<string, number>,
  stockQuantities: Map<string, number>,
): ExpandedStock[] {
  // Group by originalId + length + priority to get unique types
  const seen = new Map<string, ExpandedStock>();
  for (const s of expandedStock) {
    const key = `${s.originalId}|${s.length}|${s.priority}`;
    if (!seen.has(key)) {
      const totalQty = stockQuantities.get(s.originalId) ?? 0;
      const usedQty = usedCounts.get(s.originalId) ?? 0;
      if (usedQty < totalQty) {
        seen.set(key, s);
      }
    }
  }
  const types = Array.from(seen.values());
  // Sort by priority ASC, then length ASC
  types.sort((a, b) => a.priority - b.priority || a.length - b.length);
  return types;
}

// ---------------------------------------------------------------------------
// EXACT BACKTRACKING SOLVER (for <= EXACT_THRESHOLD expanded cuts)
// ---------------------------------------------------------------------------

function solveExact(
  expandedCuts: ExpandedCut[],
  expandedStock: ExpandedStock[],
  kerf: number,
): { bins: Bin[]; unplaced: ExpandedCut[] } {
  // Sort cuts descending by length (largest first for better pruning)
  const sortedCuts = [...expandedCuts].sort((a, b) => b.length - a.length);

  // Count available stock per original ID
  const stockQuantities = new Map<string, number>();
  for (const s of expandedStock) {
    stockQuantities.set(s.originalId, (stockQuantities.get(s.originalId) ?? 0) + 1);
  }

  // Filter out cuts that cannot fit in any stock
  const maxStockLength = Math.max(...expandedStock.map((s) => s.length), 0);
  const placeable: ExpandedCut[] = [];
  const unplaced: ExpandedCut[] = [];
  for (const cut of sortedCuts) {
    if (cut.length > maxStockLength) {
      unplaced.push(cut);
    } else {
      placeable.push(cut);
    }
  }

  if (placeable.length === 0) {
    return { bins: [], unplaced };
  }

  let bestBins: Bin[] | null = null;
  let bestCost = Infinity;
  let bestPlacedCount = 0;

  // Track how many of each stock type are used
  const usedStockCounts = new Map<string, number>();

  function backtrack(cutIndex: number, bins: Bin[]): void {
    // Check if current state is the best we've seen
    // Prioritize: most cuts placed, then lowest cost
    const currentCost = totalCost(bins);

    if (cutIndex > bestPlacedCount || (cutIndex === bestPlacedCount && currentCost < bestCost)) {
      bestPlacedCount = cutIndex;
      bestCost = currentCost;
      bestBins = cloneBins(bins);
    }

    if (cutIndex === placeable.length) {
      return;
    }

    // Pruning: if we already have a complete solution, prune by cost
    if (bestPlacedCount === placeable.length && currentCost >= bestCost) {
      return;
    }

    const cut = placeable[cutIndex];

    // Option 1: Try placing into each existing bin
    for (let i = 0; i < bins.length; i++) {
      if (canFit(bins[i], cut.length, kerf)) {
        const savedRemaining = bins[i].remaining;
        placeCut(bins[i], cut, kerf);

        backtrack(cutIndex + 1, bins);

        // Undo placement
        bins[i].cuts.pop();
        bins[i].remaining = savedRemaining;
      }
    }

    // Option 2: Open a new bin with each available stock type
    const availableTypes = getUniqueStockTypes(expandedStock, usedStockCounts, stockQuantities);

    for (const stockType of availableTypes) {
      // Prune: if we already have a complete solution, check cost
      if (bestPlacedCount === placeable.length && currentCost + stockType.priority >= bestCost) {
        continue;
      }

      const newBin = createBin(stockType);
      if (!canFit(newBin, cut.length, kerf)) {
        continue;
      }

      // Track stock usage
      usedStockCounts.set(
        stockType.originalId,
        (usedStockCounts.get(stockType.originalId) ?? 0) + 1,
      );

      placeCut(newBin, cut, kerf);
      bins.push(newBin);

      backtrack(cutIndex + 1, bins);

      // Undo
      bins.pop();
      const count = usedStockCounts.get(stockType.originalId) ?? 1;
      usedStockCounts.set(stockType.originalId, count - 1);
    }
  }

  backtrack(0, []);

  // Determine which cuts were not placed
  const finalUnplaced = [...unplaced];
  if (bestBins && bestPlacedCount < placeable.length) {
    for (let i = bestPlacedCount; i < placeable.length; i++) {
      finalUnplaced.push(placeable[i]);
    }
  }

  return {
    bins: bestBins ?? [],
    unplaced: finalUnplaced,
  };
}

// ---------------------------------------------------------------------------
// HEURISTIC SOLVER: FFD / BFD + Local Search (for > EXACT_THRESHOLD)
// ---------------------------------------------------------------------------

/**
 * First Fit Decreasing: place each cut into the first bin where it fits,
 * opening a new bin when needed.
 */
function firstFitDecreasing(
  sortedCuts: ExpandedCut[],
  expandedStock: ExpandedStock[],
  kerf: number,
): { bins: Bin[]; unplaced: ExpandedCut[] } {
  const bins: Bin[] = [];
  const unplaced: ExpandedCut[] = [];

  // Track stock usage
  const stockQuantities = new Map<string, number>();
  for (const s of expandedStock) {
    stockQuantities.set(s.originalId, (stockQuantities.get(s.originalId) ?? 0) + 1);
  }
  const usedStockCounts = new Map<string, number>();

  for (const cut of sortedCuts) {
    let placed = false;

    // Try existing bins (first fit)
    for (const bin of bins) {
      if (canFit(bin, cut.length, kerf)) {
        placeCut(bin, cut, kerf);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Open new bin - try stock types sorted by priority, then best-fit
      const availableTypes = getUniqueStockTypes(expandedStock, usedStockCounts, stockQuantities);

      // For FFD, pick the smallest stock that fits (among lowest priority)
      let bestStock: ExpandedStock | null = null;
      for (const stockType of availableTypes) {
        if (cut.length <= stockType.length) {
          if (
            bestStock === null ||
            stockType.priority < bestStock.priority ||
            (stockType.priority === bestStock.priority && stockType.length < bestStock.length)
          ) {
            bestStock = stockType;
          }
        }
      }

      if (bestStock !== null) {
        const newBin = createBin(bestStock);
        placeCut(newBin, cut, kerf);
        bins.push(newBin);
        usedStockCounts.set(
          bestStock.originalId,
          (usedStockCounts.get(bestStock.originalId) ?? 0) + 1,
        );
      } else {
        unplaced.push(cut);
      }
    }
  }

  return { bins, unplaced };
}

/**
 * Best Fit Decreasing: place each cut into the bin with the LEAST remaining
 * space where it still fits.
 */
function bestFitDecreasing(
  sortedCuts: ExpandedCut[],
  expandedStock: ExpandedStock[],
  kerf: number,
): { bins: Bin[]; unplaced: ExpandedCut[] } {
  const bins: Bin[] = [];
  const unplaced: ExpandedCut[] = [];

  const stockQuantities = new Map<string, number>();
  for (const s of expandedStock) {
    stockQuantities.set(s.originalId, (stockQuantities.get(s.originalId) ?? 0) + 1);
  }
  const usedStockCounts = new Map<string, number>();

  for (const cut of sortedCuts) {
    let bestBinIdx = -1;
    let bestRemainingAfter = Infinity;

    // Find the bin with the tightest fit
    for (let i = 0; i < bins.length; i++) {
      if (canFit(bins[i], cut.length, kerf)) {
        const remaining = remainingAfterPlacement(bins[i], cut.length, kerf);
        if (remaining < bestRemainingAfter) {
          bestRemainingAfter = remaining;
          bestBinIdx = i;
        }
      }
    }

    if (bestBinIdx >= 0) {
      placeCut(bins[bestBinIdx], cut, kerf);
    } else {
      // Open new bin
      const availableTypes = getUniqueStockTypes(expandedStock, usedStockCounts, stockQuantities);

      let bestStock: ExpandedStock | null = null;
      for (const stockType of availableTypes) {
        if (cut.length <= stockType.length) {
          if (
            bestStock === null ||
            stockType.priority < bestStock.priority ||
            (stockType.priority === bestStock.priority && stockType.length < bestStock.length)
          ) {
            bestStock = stockType;
          }
        }
      }

      if (bestStock !== null) {
        const newBin = createBin(bestStock);
        placeCut(newBin, cut, kerf);
        bins.push(newBin);
        usedStockCounts.set(
          bestStock.originalId,
          (usedStockCounts.get(bestStock.originalId) ?? 0) + 1,
        );
      } else {
        unplaced.push(cut);
      }
    }
  }

  return { bins, unplaced };
}

/**
 * Recalculate bin remaining space from scratch.
 */
function recalcBinRemaining(bin: Bin, kerf: number): void {
  let used = 0;
  for (let i = 0; i < bin.cuts.length; i++) {
    if (i === 0) {
      used += bin.cuts[i].length;
    } else {
      used += bin.cuts[i].length + kerf;
    }
  }
  bin.remaining = bin.stock.length - used;
}

/**
 * Check if all cuts from srcBin can be redistributed to other bins.
 * If so, perform the redistribution and return true.
 */
function tryEmptyBin(bins: Bin[], srcIndex: number, kerf: number): boolean {
  const srcBin = bins[srcIndex];
  if (srcBin.cuts.length === 0) return false;

  // Try to place each cut from srcBin into other bins
  const cutsToPlace = [...srcBin.cuts];
  // Sort descending so larger pieces placed first
  cutsToPlace.sort((a, b) => b.length - a.length);

  // Simulate placements on cloned bins (excluding srcBin)
  const otherBins = bins
    .filter((_, i) => i !== srcIndex)
    .map((b) => ({
      stock: b.stock,
      cuts: [...b.cuts],
      remaining: b.remaining,
    }));

  let allPlaced = true;
  for (const cut of cutsToPlace) {
    let placed = false;
    // Best fit among other bins
    let bestIdx = -1;
    let bestRemaining = Infinity;
    for (let i = 0; i < otherBins.length; i++) {
      if (canFit(otherBins[i], cut.length, kerf)) {
        const rem = remainingAfterPlacement(otherBins[i], cut.length, kerf);
        if (rem < bestRemaining) {
          bestRemaining = rem;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0) {
      placeCut(otherBins[bestIdx], cut, kerf);
      placed = true;
    }
    if (!placed) {
      allPlaced = false;
      break;
    }
  }

  if (allPlaced) {
    // Apply the redistribution to the real bins
    let otherIdx = 0;
    for (let i = 0; i < bins.length; i++) {
      if (i === srcIndex) continue;
      bins[i].cuts = otherBins[otherIdx].cuts;
      bins[i].remaining = otherBins[otherIdx].remaining;
      otherIdx++;
    }
    bins[srcIndex].cuts = [];
    bins[srcIndex].remaining = bins[srcIndex].stock.length;
    return true;
  }
  return false;
}

/**
 * Try swapping a cut from bin A with a cut from bin B if it improves total waste distribution.
 */
function trySwaps(bins: Bin[], kerf: number): boolean {
  let improved = false;

  for (let a = 0; a < bins.length; a++) {
    for (let b = a + 1; b < bins.length; b++) {
      for (let ci = 0; ci < bins[a].cuts.length; ci++) {
        for (let cj = 0; cj < bins[b].cuts.length; cj++) {
          const cutA = bins[a].cuts[ci];
          const cutB = bins[b].cuts[cj];

          if (Math.abs(cutA.length - cutB.length) < 1e-9) continue;

          // Simulate swap: remove cutA from binA, remove cutB from binB
          // then add cutB to binA and cutA to binB
          const binACuts = bins[a].cuts.filter((_, i) => i !== ci);
          const binBCuts = bins[b].cuts.filter((_, i) => i !== cj);

          // Build temp bins
          const tempA: Bin = {
            stock: bins[a].stock,
            cuts: binACuts,
            remaining: 0,
          };
          recalcBinRemaining(tempA, kerf);

          const tempB: Bin = {
            stock: bins[b].stock,
            cuts: binBCuts,
            remaining: 0,
          };
          recalcBinRemaining(tempB, kerf);

          // Try placing cutB into tempA and cutA into tempB
          if (canFit(tempA, cutB.length, kerf) && canFit(tempB, cutA.length, kerf)) {
            const newRemA = remainingAfterPlacement(tempA, cutB.length, kerf);
            const newRemB = remainingAfterPlacement(tempB, cutA.length, kerf);
            const oldWaste = bins[a].remaining + bins[b].remaining;
            const newWaste = newRemA + newRemB;

            // Swap if it reduces total waste (tighter packing)
            if (newWaste < oldWaste - 1e-9) {
              placeCut(tempA, cutB, kerf);
              placeCut(tempB, cutA, kerf);
              bins[a].cuts = tempA.cuts;
              bins[a].remaining = tempA.remaining;
              bins[b].cuts = tempB.cuts;
              bins[b].remaining = tempB.remaining;
              improved = true;
            }
          }
        }
      }
    }
  }

  return improved;
}

/**
 * Local search improvement: try to empty bins and swap cuts.
 */
function localSearchImprovement(bins: Bin[], kerf: number): void {
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // Try to empty bins (start from bins with highest priority to save cost)
    const binsByPriority = bins
      .map((_, i) => i)
      .filter((i) => bins[i].cuts.length > 0)
      .sort((a, b) => bins[b].stock.priority - bins[a].stock.priority);

    for (const idx of binsByPriority) {
      if (bins[idx].cuts.length > 0 && tryEmptyBin(bins, idx, kerf)) {
        improved = true;
      }
    }

    // Try swaps
    if (trySwaps(bins, kerf)) {
      improved = true;
    }
  }
}

function solveHeuristic(
  expandedCuts: ExpandedCut[],
  expandedStock: ExpandedStock[],
  kerf: number,
): { bins: Bin[]; unplaced: ExpandedCut[] } {
  // Sort cuts descending by length
  const sortedCuts = [...expandedCuts].sort((a, b) => b.length - a.length);

  // Run both FFD and BFD
  const ffdResult = firstFitDecreasing(sortedCuts, expandedStock, kerf);
  const bfdResult = bestFitDecreasing(sortedCuts, expandedStock, kerf);

  // Pick the one with lower total cost (fewer/cheaper bins)
  const ffdCost = totalCost(ffdResult.bins);
  const bfdCost = totalCost(bfdResult.bins);

  let result: { bins: Bin[]; unplaced: ExpandedCut[] };
  if (ffdCost <= bfdCost) {
    result = ffdResult;
  } else {
    result = bfdResult;
  }

  // Apply local search improvement
  localSearchImprovement(result.bins, kerf);

  return result;
}

// ---------------------------------------------------------------------------
// Main optimization function
// ---------------------------------------------------------------------------

export function optimize(stock: StockType[], cuts: CutItem[], kerf: number): OptimizationResult {
  // Filter out zero-quantity items
  const validStock = stock.filter((s) => s.quantity > 0 && s.length > 0);
  const validCuts = cuts.filter((c) => c.quantity > 0 && c.length > 0);

  // If no cuts, return empty result
  if (validCuts.length === 0) {
    return {
      stockResults: [],
      totalWaste: 0,
      totalWastePercent: 0,
      totalStockUsed: 0,
      totalCost: 0,
      unplacedCuts: [],
    };
  }

  // If no stock, all cuts are unplaced
  if (validStock.length === 0) {
    return {
      stockResults: [],
      totalWaste: 0,
      totalWastePercent: 0,
      totalStockUsed: 0,
      totalCost: 0,
      unplacedCuts: validCuts.map((c) => ({ ...c })),
    };
  }

  // Expand
  const expandedCuts = expandCuts(validCuts);
  const expandedStock = expandStock(validStock);

  // Choose solver based on number of expanded cuts
  let result: { bins: Bin[]; unplaced: ExpandedCut[] };
  if (expandedCuts.length <= EXACT_THRESHOLD) {
    result = solveExact(expandedCuts, expandedStock, kerf);
  } else {
    result = solveHeuristic(expandedCuts, expandedStock, kerf);
  }

  return buildResult(result.bins, result.unplaced, kerf);
}
