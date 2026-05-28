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

  // Never empty priority 1 ("First") bins — the user explicitly wants these used
  if (srcBin.stock.priority <= 1) return false;

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
 * Try to move cuts from large stock bins to smaller stock bins that have room.
 * This fills small stock better and leaves bigger remnants on large stock.
 *
 * Example: if a 1200mm bin has 1×480 (720mm waste), and a 4800mm bin has
 * 3×480 + 2×1000, we can move a 480 from the 4800mm bin to the 1200mm bin,
 * filling the small stock better and freeing space on the large stock.
 */
function tryConsolidate(bins: Bin[], kerf: number): boolean {
  let improved = false;
  const activeBins = bins.filter((b) => b.cuts.length > 0);

  // Sort: smaller stock first (these are the "receivers")
  const sortedBySize = [...activeBins].sort((a, b) => a.stock.length - b.stock.length);

  for (const receiver of sortedBySize) {
    if (receiver.remaining < 1e-9) continue; // already full

    // Look for donors: bins with LARGER stock that have cuts small enough to move
    for (const donor of activeBins) {
      if (donor === receiver) continue;
      if (donor.stock.length <= receiver.stock.length) continue; // only take from bigger stock

      // Try each cut in the donor
      for (let ci = donor.cuts.length - 1; ci >= 0; ci--) {
        const cut = donor.cuts[ci];

        // Would this cut fit in the receiver?
        if (!canFit(receiver, cut.length, kerf)) continue;

        // Move it: remove from donor, add to receiver
        donor.cuts.splice(ci, 1);
        recalcBinRemaining(donor, kerf);
        placeCut(receiver, cut, kerf);
        improved = true;

        // If receiver is now full, stop trying to fill it
        if (receiver.remaining < 1e-9) break;
      }
      if (receiver.remaining < 1e-9) break;
    }
  }

  return improved;
}

/**
 * Rebalance: try replacing a large cut on small stock with smaller cuts from
 * big stock, when the swap would fill the small stock more fully.
 *
 * Example: 1200mm has 1×1000 (200mm remnant). A 4800mm has 3×480 + 2×1000.
 * Swap the 1000 on the 1200 with 2×480 from the 4800 → 1200 now has 2×480
 * (240mm remnant) but the 4800 gets a 1000 back and loses 2×480, giving it
 * a bigger remnant.
 */
function tryRebalance(bins: Bin[], kerf: number): boolean {
  let improved = false;
  const activeBins = bins.filter((b) => b.cuts.length > 0);

  for (const smallBin of activeBins) {
    for (let si = 0; si < smallBin.cuts.length; si++) {
      const largeCut = smallBin.cuts[si];

      for (const bigBin of activeBins) {
        if (bigBin === smallBin) continue;
        if (bigBin.stock.length <= smallBin.stock.length) continue;

        // Find cuts in bigBin smaller than largeCut
        const candidateCuts: { index: number; cut: ExpandedCut }[] = [];
        for (let bi = 0; bi < bigBin.cuts.length; bi++) {
          if (bigBin.cuts[bi].length < largeCut.length) {
            candidateCuts.push({ index: bi, cut: bigBin.cuts[bi] });
          }
        }
        if (candidateCuts.length === 0) continue;

        // Sort candidates largest first for best packing
        candidateCuts.sort((a, b) => b.cut.length - a.cut.length);

        // Simulate: remove largeCut from smallBin, fit candidates, put largeCut on bigBin
        const tempSmall: Bin = {
          stock: smallBin.stock,
          cuts: smallBin.cuts.filter((_, i) => i !== si),
          remaining: 0,
        };
        recalcBinRemaining(tempSmall, kerf);

        const movedIndices: number[] = [];

        for (const { index, cut } of candidateCuts) {
          if (canFit(tempSmall, cut.length, kerf)) {
            placeCut(tempSmall, cut, kerf);
            movedIndices.push(index);
          }
        }

        if (movedIndices.length === 0) continue;

        // Remove moved cuts from bigBin copy and add largeCut
        const tempBig: Bin = {
          stock: bigBin.stock,
          cuts: bigBin.cuts.filter((_, i) => !movedIndices.includes(i)),
          remaining: 0,
        };
        recalcBinRemaining(tempBig, kerf);

        if (!canFit(tempBig, largeCut.length, kerf)) continue;
        placeCut(tempBig, largeCut, kerf);

        // Accept if total waste doesn't increase AND the big bin gets a bigger
        // remnant (consolidates waste into fewer, larger pieces).
        // The small bin may get slightly more waste, but we're trading that
        // for a much larger remnant on the big stock.
        const totalOld = smallBin.remaining + bigBin.remaining;
        const totalNew = tempSmall.remaining + tempBig.remaining;
        const bigBinImproved = tempBig.remaining > bigBin.remaining + 1e-9;

        if (totalNew <= totalOld + 1e-9 && bigBinImproved) {
          smallBin.cuts = tempSmall.cuts;
          smallBin.remaining = tempSmall.remaining;
          bigBin.cuts = tempBig.cuts;
          bigBin.remaining = tempBig.remaining;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
    if (improved) break;
  }

  return improved;
}

/**
 * Fill gaps: find bins with remaining space that can fit a cut, then move
 * a matching cut from the bin with the MOST remaining space (least utilized).
 * This concentrates waste into fewer bins.
 */
function tryFillGaps(bins: Bin[], kerf: number): boolean {
  let improved = false;
  const activeBins = bins.filter((b) => b.cuts.length > 0);

  // Sort receivers by remaining space ascending (tightest first — fill these)
  const receivers = [...activeBins].sort((a, b) => a.remaining - b.remaining);

  for (const receiver of receivers) {
    if (receiver.remaining < 1e-9) continue;

    // Sort donors by remaining space descending (loosest first — take from these)
    // Never take from priority 1 bins — user wants those used
    const donors = [...activeBins]
      .filter((b) => b !== receiver && b.cuts.length > 1 && b.stock.priority > 1)
      .sort((a, b) => b.remaining - a.remaining);

    for (const donor of donors) {
      // Skip if donor has less remaining than receiver (would just ping-pong)
      if (donor.remaining <= receiver.remaining) continue;

      // Find the largest cut in donor that fits the receiver's gap
      const sortedDonorCuts = donor.cuts
        .map((cut, index) => ({ cut, index }))
        .filter(({ cut }) => canFit(receiver, cut.length, kerf))
        .sort((a, b) => b.cut.length - a.cut.length);

      if (sortedDonorCuts.length === 0) continue;

      // Pick the largest fitting cut — fills the gap most efficiently
      const { cut, index } = sortedDonorCuts[0];

      // Simulate the move
      const newReceiverRemaining = remainingAfterPlacement(receiver, cut.length, kerf);

      // Donor loses a cut: recalc its remaining
      const tempDonor: Bin = {
        stock: donor.stock,
        cuts: donor.cuts.filter((_, i) => i !== index),
        remaining: 0,
      };
      recalcBinRemaining(tempDonor, kerf);
      const newDonorRemaining = tempDonor.remaining;

      // Accept if receiver gets packed tighter and total waste doesn't increase
      const oldTotal = receiver.remaining + donor.remaining;
      const newTotal = newReceiverRemaining + newDonorRemaining;

      if (newReceiverRemaining < receiver.remaining - 1e-9 && newTotal <= oldTotal + 1e-9) {
        donor.cuts.splice(index, 1);
        recalcBinRemaining(donor, kerf);
        placeCut(receiver, cut, kerf);
        improved = true;
        break;
      }
    }
  }

  return improved;
}

/**
 * Local search improvement.
 * Phase 1: empty bins + swaps + fill gaps to minimize stock count and pack tight.
 * Phase 2: consolidate + rebalance + fill gaps to ensure small stock is well-utilized.
 */
function localSearchImprovement(bins: Bin[], kerf: number): void {
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  // Phase 1: minimize bin count and pack tight
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    const binsByPriority = bins
      .map((_, i) => i)
      .filter((i) => bins[i].cuts.length > 0)
      .sort((a, b) => bins[b].stock.priority - bins[a].stock.priority);

    for (const idx of binsByPriority) {
      if (bins[idx].cuts.length > 0 && tryEmptyBin(bins, idx, kerf)) {
        improved = true;
      }
    }

    if (trySwaps(bins, kerf)) {
      improved = true;
    }
  }

  // Phase 2: fill small stock and remaining gaps
  improved = true;
  iterations = 0;
  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    if (tryConsolidate(bins, kerf)) {
      improved = true;
    }
    if (tryRebalance(bins, kerf)) {
      improved = true;
    }
    if (tryFillGaps(bins, kerf)) {
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

  // After local search may have created new gaps, try to place unplaced cuts
  if (result.unplaced.length > 0) {
    const stillUnplaced: ExpandedCut[] = [];
    // Sort unplaced descending so larger cuts get priority
    const sortedUnplaced = [...result.unplaced].sort((a, b) => b.length - a.length);

    for (const cut of sortedUnplaced) {
      let bestIdx = -1;
      let bestRemaining = Infinity;
      for (let i = 0; i < result.bins.length; i++) {
        if (canFit(result.bins[i], cut.length, kerf)) {
          const rem = remainingAfterPlacement(result.bins[i], cut.length, kerf);
          if (rem < bestRemaining) {
            bestRemaining = rem;
            bestIdx = i;
          }
        }
      }
      if (bestIdx >= 0) {
        placeCut(result.bins[bestIdx], cut, kerf);
      } else {
        stillUnplaced.push(cut);
      }
    }
    result.unplaced = stillUnplaced;
  }

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
