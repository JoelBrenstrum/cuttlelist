export interface StockType {
  id: string;
  length: number;
  quantity: number;
  priority: number; // lower = use first (cost weight)
  label?: string;
}

export interface CutItem {
  id: string;
  length: number;
  quantity: number;
  label?: string;
}

export interface CutPlacement {
  cutId: string;
  length: number;
  label?: string;
}

export interface StockResult {
  stockId: string;
  stockLength: number;
  stockLabel?: string;
  priority: number;
  cuts: CutPlacement[];
  usedLength: number;
  wasteLength: number;
  wastePercent: number;
}

export interface OptimizationResult {
  stockResults: StockResult[];
  totalWaste: number;
  totalWastePercent: number;
  totalStockUsed: number;
  totalCost: number;
  unplacedCuts: CutItem[];
}

export interface CutlistSet {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  stock: StockType[];
  cuts: CutItem[];
  kerf: number;
  unit: "mm" | "in";
}
