import { optimize } from '../src/optimizer.ts';

const stock = [
  { id: 's2280', length: 2280, quantity: 1, priority: 1 },
  { id: 's2060', length: 2060, quantity: 2, priority: 1 },
  { id: 's2020', length: 2020, quantity: 1, priority: 1 },
  { id: 's2010', length: 2010, quantity: 1, priority: 1 },
  { id: 's1640', length: 1640, quantity: 1, priority: 1 },
  { id: 's1930', length: 1930, quantity: 1, priority: 1 },
  { id: 's1990', length: 1990, quantity: 2, priority: 1 },
  { id: 's1880', length: 1880, quantity: 1, priority: 1 },
  { id: 's680', length: 680, quantity: 1, priority: 1 },
  { id: 's1820', length: 1820, quantity: 1, priority: 1 },
  { id: 's1720', length: 1720, quantity: 1, priority: 1 },
  { id: 's1560', length: 1560, quantity: 1, priority: 1 },
];

const cuts = [
  { id: 'cSideLong', length: 1440, quantity: 3, label: 'Side-Long' },
  { id: 'cSideShort', length: 610, quantity: 4, label: 'Side-short' },
  { id: 'cTopSmall', length: 466, quantity: 12, label: 'Top-small' },
  { id: 'cTopLarge', length: 934, quantity: 12, label: 'Top-large' },
  { id: 'cSideShortHalf', length: 305, quantity: 2, label: 'Side-short-half' },
];

const result = optimize(stock, cuts, 3);

console.log('=== Results ===');
for (const sr of result.stockResults) {
  const c = sr.cuts.map(c => `${c.label || c.cutId}(${c.length})`).join(' + ');
  console.log(`${sr.stockLength}mm: ${c} → remnant ${sr.wasteLength}mm`);
}

console.log(`\nTotal stock: ${result.totalStockUsed}`);
console.log(`Unplaced: ${result.unplacedCuts.length}`);
for (const u of result.unplacedCuts) {
  console.log(`  ${u.label || u.id}: ${u.length}mm × ${u.quantity}`);
}

// Check: any bin with enough remaining for a 305+3=308?
const couldFit = result.stockResults.filter(sr => sr.wasteLength >= 308);
console.log(`\nBins that COULD fit 305+3kerf:`, couldFit.map(sr => `${sr.stockLength}mm (${sr.wasteLength}mm remaining)`));
