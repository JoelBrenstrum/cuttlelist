import { optimize } from '../src/optimizer.ts';

const stock = [
  { id: 's4800', length: 4800, quantity: 7, priority: 3 },
  { id: 's1200', length: 1200, quantity: 3, priority: 1 },
  { id: 's720', length: 720, quantity: 1, priority: 1 },
  { id: 's480', length: 480, quantity: 1, priority: 1 },
];
const cuts = [
  { id: 'c480', length: 480, quantity: 18 },
  { id: 'c1000', length: 1000, quantity: 12 },
  { id: 'c1400', length: 1400, quantity: 6 },
  { id: 'c1220', length: 1220, quantity: 3 },
];

const result = optimize(stock, cuts, 3);

console.log('=== Stock usage ===');
for (const sr of result.stockResults) {
  const c = sr.cuts.map(c => c.length).join(' + ');
  console.log(`${sr.stockLength}mm (p${sr.priority}): ${c} → remnant ${sr.wasteLength.toFixed(0)}mm (${sr.wastePercent.toFixed(1)}%)`);
}
console.log(`\nTotal: ${result.totalStockUsed} pieces, ${result.totalWaste.toFixed(0)}mm remnant`);

const p1Used = result.stockResults.filter(sr => sr.priority === 1);
console.log(`\nPriority 1 bins used: ${p1Used.length} (720mm, 480mm, 1200mm should appear)`);
for (const sr of p1Used) {
  console.log(`  ${sr.stockLength}mm: ${sr.cuts.map(c=>c.length).join(' + ')}`);
}
