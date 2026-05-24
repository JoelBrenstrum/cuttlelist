import { optimize } from '../src/optimizer.ts';

// Patch: temporarily add logging to tryFillGaps by running the logic externally

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

// Simulate what fill-gaps would do on the final result
const bins = result.stockResults;
const kerf = 3;

// Find the two problematic bins
const bin11 = bins.find(b => b.stockLength === 4800 && b.cuts.length === 8 && b.cuts[0].length === 480);
const bin12 = bins.find(b => b.stockLength === 4800 && b.cuts.length === 4 && b.cuts[0].length === 480);

if (bin11 && bin12) {
  console.log('bin11 (receiver):', bin11.cuts.length, '×480, remaining:', bin11.wasteLength);
  console.log('bin12 (donor):', bin12.cuts.length, '×480, remaining:', bin12.wasteLength);
  
  // Can 480 fit on bin11?
  const remaining = bin11.wasteLength; // This is the "remaining" after all cuts+kerf
  // For fill-gaps, remaining = stock.length - usedLength
  // canFit checks: remainingAfterPlacement >= -1e-9
  // For bins with cuts: remaining - cutLength - kerf
  const afterPlacement = remaining - 480 - kerf;
  console.log('After placing 480:', afterPlacement, '→ fits:', afterPlacement >= -1e-9);
  
  // Donor keeps at least 1 cut? 4 > 1 = yes
  console.log('Donor keeps 1+?', bin12.cuts.length > 1);
  
  // Donor priority > 1? 3 > 1 = yes
  console.log('Donor priority > 1?', bin12.priority > 1);
  
  // newReceiverRemaining < receiver.remaining? 456 < 939 = yes
  console.log('Receiver gets tighter?', afterPlacement, '<', remaining, '=', afterPlacement < remaining);
  
  // Total check
  const oldTotal = remaining + bin12.wasteLength;
  const newDonorRemaining = 4800 - (480 + (480+3) + (480+3)); // 3×480 with 2 kerfs
  const newTotal = afterPlacement + newDonorRemaining;
  console.log('Old total:', oldTotal, 'New total:', newTotal, 'OK?', newTotal <= oldTotal);
  
  console.log('\nAll checks pass! Fill-gaps SHOULD have moved this.');
  console.log('The issue must be in the internal bin representation vs the output.');
} else {
  console.log('Could not find the expected bins. Current layout:');
  for (const b of bins) {
    if (b.stockLength === 4800) {
      console.log(`  ${b.cuts.length} cuts, remnant=${b.wasteLength}`);
    }
  }
}
