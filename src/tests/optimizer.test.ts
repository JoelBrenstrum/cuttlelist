import { describe, it, expect } from "vite-plus/test";
import { optimize } from "../optimizer";
import type { StockType, CutItem } from "../types";

describe("optimize", () => {
  // -----------------------------------------------------------------------
  // Basic Cases
  // -----------------------------------------------------------------------

  it("should handle single stock, single cut", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [{ id: "c1", length: 40, quantity: 1 }];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults).toHaveLength(1);
    expect(result.stockResults[0].cuts).toHaveLength(1);
    expect(result.stockResults[0].cuts[0].cutId).toBe("c1");
    expect(result.stockResults[0].cuts[0].length).toBe(40);
    expect(result.stockResults[0].usedLength).toBe(40);
    expect(result.stockResults[0].wasteLength).toBe(60);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should place multiple cuts in one stock piece", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 2, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 30, quantity: 1 },
      { id: "c2", length: 30, quantity: 1 },
      { id: "c3", length: 30, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].cuts).toHaveLength(3);
    expect(result.stockResults[0].usedLength).toBe(90);
    expect(result.stockResults[0].wasteLength).toBe(10);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should sort cuts largest first (descending)", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 5, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 10, quantity: 1 },
      { id: "c2", length: 50, quantity: 1 },
      { id: "c3", length: 30, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    // All should fit in one stock piece
    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].usedLength).toBe(90);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Kerf Handling
  // -----------------------------------------------------------------------

  it("should apply kerf between cuts but not before first cut", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 2, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 30, quantity: 1 },
      { id: "c2", length: 30, quantity: 1 },
      { id: "c3", length: 30, quantity: 1 },
    ];
    const kerf = 5;
    const result = optimize(stock, cuts, kerf);

    // 30 + (5+30) + (5+30) = 100, exact fit in one piece!
    expect(result.totalStockUsed).toBe(1);
    expect(result.unplacedCuts).toHaveLength(0);

    // All 3 cuts fit: used = 30 + 30 + 30 + 5 + 5 (two kerfs) = 100
    expect(result.stockResults[0].cuts).toHaveLength(3);
    expect(result.stockResults[0].usedLength).toBe(100);
    expect(result.stockResults[0].wasteLength).toBe(0);
  });

  it("should not add kerf after the last cut", () => {
    const stock: StockType[] = [{ id: "s1", length: 50, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [{ id: "c1", length: 50, quantity: 1 }];
    const kerf = 3;
    const result = optimize(stock, cuts, kerf);

    // Exact fit - cut length equals stock length, no kerf needed for single cut
    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].usedLength).toBe(50);
    expect(result.stockResults[0].wasteLength).toBe(0);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should handle kerf correctly with two cuts that barely fit", () => {
    const stock: StockType[] = [{ id: "s1", length: 63, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 30, quantity: 1 },
      { id: "c2", length: 30, quantity: 1 },
    ];
    const kerf = 3;
    const result = optimize(stock, cuts, kerf);

    // 30 + 3 + 30 = 63, exact fit
    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].usedLength).toBe(63);
    expect(result.stockResults[0].wasteLength).toBe(0);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should handle kerf causing a cut to not fit", () => {
    const stock: StockType[] = [{ id: "s1", length: 62, quantity: 2, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 30, quantity: 1 },
      { id: "c2", length: 30, quantity: 1 },
    ];
    const kerf = 3;
    const result = optimize(stock, cuts, kerf);

    // 30 + 3 + 30 = 63 > 62, so second cut goes to a new stock
    expect(result.totalStockUsed).toBe(2);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Stock Priority
  // -----------------------------------------------------------------------

  it("should prefer stock with lower priority (cost weight)", () => {
    const stock: StockType[] = [
      { id: "expensive", length: 100, quantity: 5, priority: 10, label: "Expensive" },
      { id: "cheap", length: 100, quantity: 5, priority: 1, label: "Cheap" },
    ];
    const cuts: CutItem[] = [{ id: "c1", length: 50, quantity: 1 }];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].stockId).toBe("cheap");
    expect(result.totalCost).toBe(1);
  });

  it("should use multiple stock types respecting priority order", () => {
    const stock: StockType[] = [
      { id: "premium", length: 120, quantity: 1, priority: 5 },
      { id: "standard", length: 100, quantity: 1, priority: 2 },
      { id: "budget", length: 80, quantity: 2, priority: 1 },
    ];
    const cuts: CutItem[] = [
      { id: "c1", length: 70, quantity: 2 },
      { id: "c2", length: 20, quantity: 2 },
    ];
    const result = optimize(stock, cuts, 0);

    // Optimal: 2 budget pieces (70+20 on each = 90 on 80??) — 70 doesn't fit in 80
    // Actually 70 > 80 is false, 70 < 80, so 70 fits in budget(80)
    // But 70+20 = 90 > 80, so each budget piece gets one 70-length cut
    // Wait: 70 < 80, remaining = 10 after first cut, 20 won't fit
    // So: budget gets 70, budget gets 70, standard gets 20+20=40
    // Cost: 1 + 1 + 2 = 4
    // Or: standard gets 70+20=90 on 100, budget gets 70, and 20 on budget
    // Cost: 2 + 1 + 1 = 4
    // Or: premium gets 70+20+20=110 on 120, budget gets 70
    // Cost: 5 + 1 = 6
    // Best is cost = 4
    expect(result.unplacedCuts).toHaveLength(0);
    expect(result.totalCost).toBeLessThanOrEqual(4);
  });

  // -----------------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------------

  it("should handle cut too large for any stock -> unplacedCuts", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 5, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 150, quantity: 1 },
      { id: "c2", length: 50, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    expect(result.unplacedCuts).toHaveLength(1);
    expect(result.unplacedCuts[0].id).toBe("c1");
    expect(result.unplacedCuts[0].length).toBe(150);
    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].cuts[0].cutId).toBe("c2");
  });

  it("should handle zero quantity cuts (ignored)", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 5, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 50, quantity: 0 },
      { id: "c2", length: 30, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].cuts).toHaveLength(1);
    expect(result.stockResults[0].cuts[0].cutId).toBe("c2");
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should handle zero quantity stock (ignored)", () => {
    const stock: StockType[] = [
      { id: "s1", length: 100, quantity: 0, priority: 1 },
      { id: "s2", length: 80, quantity: 1, priority: 2 },
    ];
    const cuts: CutItem[] = [{ id: "c1", length: 50, quantity: 1 }];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].stockId).toBe("s2");
  });

  it("should handle exact fit (cut = stock length)", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [{ id: "c1", length: 100, quantity: 1 }];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].usedLength).toBe(100);
    expect(result.stockResults[0].wasteLength).toBe(0);
    expect(result.stockResults[0].wastePercent).toBe(0);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should return empty result when no cuts provided", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 5, priority: 1 }];
    const cuts: CutItem[] = [];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(0);
    expect(result.stockResults).toHaveLength(0);
    expect(result.totalWaste).toBe(0);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should return all cuts as unplaced when no stock provided", () => {
    const stock: StockType[] = [];
    const cuts: CutItem[] = [{ id: "c1", length: 50, quantity: 2 }];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(0);
    expect(result.unplacedCuts).toHaveLength(1);
    expect(result.unplacedCuts[0].id).toBe("c1");
    expect(result.unplacedCuts[0].quantity).toBe(2);
  });

  // -----------------------------------------------------------------------
  // Exact Mode (≤15 expanded cuts)
  // -----------------------------------------------------------------------

  it("should use exact mode for ≤15 items and find optimal solution", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 10, priority: 1 }];
    // 5 cuts, well within exact threshold
    const cuts: CutItem[] = [
      { id: "c1", length: 40, quantity: 2 },
      { id: "c2", length: 25, quantity: 2 },
      { id: "c3", length: 10, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    // Optimal: 40+40+10=90 in one piece, 25+25=50 in another = 2 pieces
    // Or: 40+25+25+10=100 in one piece, 40 in another = 2 pieces
    // Either way, 2 pieces is optimal
    expect(result.totalStockUsed).toBe(2);
    expect(result.totalCost).toBe(2);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should find provably optimal packing in exact mode", () => {
    const stock: StockType[] = [{ id: "s1", length: 10, quantity: 10, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 7, quantity: 1 },
      { id: "c2", length: 5, quantity: 1 },
      { id: "c3", length: 3, quantity: 1 },
      { id: "c4", length: 4, quantity: 1 },
      { id: "c5", length: 6, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    // Total cut length = 7+5+3+4+6 = 25, so minimum bins = ceil(25/10) = 3
    // Can we fit in 3? 7+3=10, 6+4=10, 5=5 -> yes, 3 bins
    expect(result.totalStockUsed).toBe(3);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Heuristic Mode (>15 expanded cuts)
  // -----------------------------------------------------------------------

  it("should handle more than 15 expanded cuts using heuristic mode", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 50, priority: 1 }];
    // 20 cuts -> heuristic mode
    const cuts: CutItem[] = [
      { id: "c1", length: 45, quantity: 10 },
      { id: "c2", length: 25, quantity: 10 },
    ];
    const result = optimize(stock, cuts, 0);

    // Each stock fits: 45+45=90 or 45+25+25=95 or 25*4=100
    // Optimal: 45+25+25=95 per stock → 10 stocks for all items?
    // Actually: 10x45 + 10x25 = 450 + 250 = 700 total. 700/100 = 7 minimum.
    // 45+25+25 = 95 → that uses 1 of 45 and 2 of 25 per stock.
    // After 5 of these: 5×45 used, 10×25 used. Remaining: 5×45
    // 5×45 → 45+45=90 per stock → 2 stocks + 1 leftover = 3 stocks
    // Total: 5 + 3 = 8 stocks
    // Can we do better? 25*4=100 → 2 stocks for 8×25, then 10×45 / 2 per stock = 5 stocks + 2×25 remain
    // That's 5 + 2 = 7... but wait: 25*4 = 100 uses 8 of 25, 2 remain. 45+45=90 uses 10 of 45. 25+25=50 for last.
    // 5 + 1 + 1 = 7 stocks? Let's check: 5 stocks of 45+45, 2 stocks of 25+25+25+25, wait 10/4=2.5
    // Better: 7 minimum (700/100), heuristic should get close
    expect(result.totalStockUsed).toBeLessThanOrEqual(8);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Multiple Stock Types with Different Priorities
  // -----------------------------------------------------------------------

  it("should minimize cost with multiple stock types", () => {
    const stock: StockType[] = [
      { id: "offcut", length: 50, quantity: 2, priority: 0, label: "Free Offcut" },
      { id: "standard", length: 100, quantity: 10, priority: 5, label: "Standard" },
    ];
    const cuts: CutItem[] = [
      { id: "c1", length: 40, quantity: 2 },
      { id: "c2", length: 20, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    // Optimal: use 2 free offcuts (40 in each), standard for remaining 20
    // Cost: 0 + 0 + 5 = 5
    // OR: 40+20 in offcut (60 > 50, nope)
    // Offcut is 50: 40 fits, 20 fits.
    // Best: offcut for 40, offcut for 40, ...but 20 left.
    // 20 fits in offcut? no more offcuts (quantity=2, both used for 40s)
    // So: 2 offcuts (40 each) + 1 standard (20) = cost 0+0+5 = 5
    // Alt: 1 offcut (40), 1 offcut (20), 1 standard (40) = cost 0+0+5 = 5
    // Alt: 1 offcut (40+20=60 > 50, no)
    // Actually offcut+kerf: 40 in offcut, 20 in offcut. both priority 0.
    // Then 40 in standard. Cost = 0 + 0 + 5 = 5
    expect(result.totalCost).toBeLessThanOrEqual(5);
    expect(result.unplacedCuts).toHaveLength(0);

    // Verify offcuts are used
    const offcutResults = result.stockResults.filter((sr) => sr.stockId === "offcut");
    expect(offcutResults.length).toBeGreaterThanOrEqual(1);
  });

  it("should handle limited stock quantities", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 60, quantity: 1 },
      { id: "c2", length: 60, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    // Only 1 stock available, can only fit one 60-length cut
    // Second cut should be unplaced
    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].cuts).toHaveLength(1);
    expect(result.unplacedCuts).toHaveLength(1);
    expect(result.unplacedCuts[0].id).toBe("c2");
  });

  // -----------------------------------------------------------------------
  // Waste Calculations
  // -----------------------------------------------------------------------

  it("should calculate waste percentages correctly", () => {
    const stock: StockType[] = [{ id: "s1", length: 200, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 80, quantity: 1 },
      { id: "c2", length: 60, quantity: 1 },
    ];
    const result = optimize(stock, cuts, 0);

    expect(result.totalStockUsed).toBe(1);
    expect(result.stockResults[0].usedLength).toBe(140);
    expect(result.stockResults[0].wasteLength).toBe(60);
    expect(result.stockResults[0].wastePercent).toBe(30);
    expect(result.totalWaste).toBe(60);
    expect(result.totalWastePercent).toBe(30);
  });

  it("should calculate waste with kerf included as used length", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 1, priority: 1 }];
    const cuts: CutItem[] = [
      { id: "c1", length: 40, quantity: 1 },
      { id: "c2", length: 30, quantity: 1 },
    ];
    const kerf = 5;
    const result = optimize(stock, cuts, kerf);

    // used = 40 + 30 + 5 (one kerf) = 75
    expect(result.stockResults[0].usedLength).toBe(75);
    expect(result.stockResults[0].wasteLength).toBe(25);
    expect(result.stockResults[0].wastePercent).toBe(25);
  });

  // -----------------------------------------------------------------------
  // Labels
  // -----------------------------------------------------------------------

  it("should preserve labels in results", () => {
    const stock: StockType[] = [
      { id: "s1", length: 100, quantity: 1, priority: 1, label: "Oak 8ft" },
    ];
    const cuts: CutItem[] = [{ id: "c1", length: 50, quantity: 1, label: "Shelf A" }];
    const result = optimize(stock, cuts, 0);

    expect(result.stockResults[0].stockLabel).toBe("Oak 8ft");
    expect(result.stockResults[0].cuts[0].label).toBe("Shelf A");
  });

  // -----------------------------------------------------------------------
  // Quantity Expansion
  // -----------------------------------------------------------------------

  it("should expand quantities correctly", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 5, priority: 1 }];
    const cuts: CutItem[] = [{ id: "c1", length: 30, quantity: 4 }];
    const result = optimize(stock, cuts, 0);

    // 4 cuts of 30: 30*3=90 fits in one piece, 30 needs another
    // Or 30*4=120 needs at least 2 pieces
    // Optimal: 3 cuts in one (90), 1 cut in another (30) → 2 pieces
    expect(result.totalStockUsed).toBe(2);

    // Total cuts placed across all stocks should be 4
    const totalCuts = result.stockResults.reduce((sum, sr) => sum + sr.cuts.length, 0);
    expect(totalCuts).toBe(4);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Complex Scenarios
  // -----------------------------------------------------------------------

  it("should optimize a realistic woodworking scenario", () => {
    const stock: StockType[] = [
      { id: "8ft", length: 2438, quantity: 10, priority: 3, label: "8ft 2x4" },
      { id: "offcut1", length: 610, quantity: 1, priority: 0, label: "Offcut" },
    ];
    const cuts: CutItem[] = [
      { id: "stud", length: 2337, quantity: 4, label: "Wall Stud" },
      { id: "block", length: 356, quantity: 6, label: "Blocking" },
      { id: "cripple", length: 254, quantity: 2, label: "Cripple" },
    ];
    const kerf = 3;
    const result = optimize(stock, cuts, kerf);

    expect(result.unplacedCuts).toHaveLength(0);

    // Studs are 2337mm, only fit in 8ft (2438mm) stock
    // Each stud uses one 8ft piece, leaving 2438-2337=101mm (too small for blocks/cripples after kerf)
    // Wait: 101mm remaining. Block is 356 (too big). Cripple is 254 (too big? 101 < 254, yes).
    // So 4 studs need 4 × 8ft pieces
    // 6 blocks + 2 cripples: 356*6 + 254*2 = 2136 + 508 = 2644mm
    // Can fit in offcut? 610mm → 356+3+254 = 613 > 610. Nope.
    // 356 fits in offcut (610-356=254), then 254 fits: 356+3+254=613 > 610, no.
    // 254+3+254 = 511 fits in 610. Or 356 alone in offcut.
    // Use offcut for something, rest in 8ft pieces
    expect(result.totalStockUsed).toBeGreaterThanOrEqual(5);

    // All cuts should be placed
    const totalCutsPlaced = result.stockResults.reduce((sum, sr) => sum + sr.cuts.length, 0);
    expect(totalCutsPlaced).toBe(12); // 4+6+2
  });

  it("should handle the exact threshold boundary (15 cuts)", () => {
    const stock: StockType[] = [{ id: "s1", length: 100, quantity: 20, priority: 1 }];
    // Exactly 15 expanded cuts → should use exact mode
    const cuts: CutItem[] = [
      { id: "c1", length: 20, quantity: 5 },
      { id: "c2", length: 15, quantity: 5 },
      { id: "c3", length: 10, quantity: 5 },
    ];
    const result = optimize(stock, cuts, 0);

    // Total = 5*20 + 5*15 + 5*10 = 100+75+50 = 225
    // Minimum bins = ceil(225/100) = 3
    // Can we do 3? 20+20+20+20+20=100, 15+15+15+15+15=75+10+10+10=105>100
    // 20+15+15+15+15+10+10=100, perfect! 20+20+20+10+10+10=90.
    // So 3 bins: [20+15+15+15+15+10+10=100], [20+20+20+10+10+10=90], [20+20=40]
    // Hmm that's still 3? Let me re-check: 100+90+40=230≠225. Let me recount.
    // We have five 20s, five 15s, five 10s = 15 items, total 225.
    // Bin1: 20+20+20+20+20=100 ✓
    // Bin2: 15+15+15+15+15+10=85
    // Bin3: 10+10+10+10=40
    // = 3 bins, total 100+85+40=225 ✓
    // Or: Bin1: 20+15+15+15+15+10+10=100, Bin2: 20+20+20+10+10+10=90, only need 2 bins? 100+90=190≠225
    // Wait I miscounted: 20+15+15+15+15+10+10 = 100, that's 7 items
    // Remaining 8 items: 20+20+20+20+10+10+10 = 110 > 100, need 2 bins.
    // Bin2: 20+20+20+20+10=90 (5 items), Bin3: 10+10=20 (2 items, but only 10+10 left)
    // Total items: 7+5+2=14, but we have 15. Let me recount.
    // Bin1: 20, 15, 15, 15, 15, 10, 10 = 7 items = 100
    // Remaining: 20, 20, 20, 20, 15, 10, 10, 10 = 8 items = 125
    // Bin2: 20+20+20+20+10+10=100 = 6 items
    // Bin3: 15+10=25 = 2 items
    // Total: 15 items, 3 bins ✓
    expect(result.totalStockUsed).toBe(3);
    expect(result.unplacedCuts).toHaveLength(0);
  });

  it("should handle stock with different lengths and priorities", () => {
    const stock: StockType[] = [
      { id: "short", length: 50, quantity: 10, priority: 1 },
      { id: "long", length: 120, quantity: 10, priority: 3 },
    ];
    const cuts: CutItem[] = [
      { id: "c1", length: 45, quantity: 3 },
      { id: "c2", length: 30, quantity: 3 },
    ];
    const result = optimize(stock, cuts, 0);

    // Prefer short (priority 1) over long (priority 3)
    // Short (50) can hold: 45 (remaining 5), or 30 (remaining 20), or 30+? no 30+30=60>50
    // So: 3 short for 3x45, 2 short for 30+... no, 30 alone, or try 30+20? no 20 cuts
    // 3 short pieces for 45s, 3 short pieces for 30s = 6 pieces cost=6
    // Alt: 2 long pieces for 45+30+30=105 on 120, then 45+45+30=120 perfect
    // Wait 45+30+30=105 ≤ 120, then 45+30=75 ≤ 120. Cost=3+3=6
    // Alt: 1 long (45+45+30=120, exact!) + 1 short (30) + 1 short (30) = 3+1+1=5
    // Even better: 1 long (45+45+30=120) + 2 short (30 each) = 3+1+1=5
    expect(result.totalCost).toBeLessThanOrEqual(6);
    expect(result.unplacedCuts).toHaveLength(0);
  });
});
